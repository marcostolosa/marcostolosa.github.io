---
title: OSINT - Finding Domains
description: "Descrição teste"
picture: blog1.jpg

label_default: "alice"
label_primary: "story"
label_success: "blog"
label_info: "personal"
label_warning: "warning"
label_danger: "danger"
---

> The art of finding subdomains has evolved a lot in the past few years. Finding subdomains manually would take an eternity. Fortunately, we don’t have to.

Subdomain scanner utilities let you explore the full domain infrastructure of any company in the world. But what are today’s most popular uses of these subdomain enumeration toolkits? Let’s find out.

### DNS audit
Every week we see media news related to DNS attacks, and yet, performing a scheduled DNS audit is something most companies never do. Which is odd, because unning a DNS audit is one of the most effective ways to find and update stale DNS records and find unused subdomains, expired SSL certificates or exposed legacy software.

### Domain intelligence
Red teams often use subdomain discovery toolkits in their infosec investigations, which frequently involve a number of OSINT techniques. These subdomain enumeration tools help to discover forgotten public areas that might be exposing sensitive information about your apps, users or technologies.

### Vulnerability scanning
An extensive list of domain names along with their subdomains can yield remarkable findings about any online company.Private areas, development versions and unprotected applications can often be found while auditing the full list of subdomains of any domain name.

* * *

## How subdomain scanners work
> Let’s analyze the most popular methods subdomain scanners and domain tools used to find subdomains.

### Querying search engines
[Google hacking techniques](https://securitytrails.com/blog/google-hacking-techniques) are often used to find the subdomains of any domain name. This involves a simple command such as:
```
site:cloudflare.com -www
```
This can return the full list of Google indexed subdomains. While this subdomain query is not in real time, as it comes from the latest GoogleBot crawl, it’s often really useful for finding all subdomains that are not protected by robots.txt configurations or subdomains not using noindex meta tags.

### Performing brute force discovery
Some discovery tools use brute force and recursive brute forcing techniques in order to generate subdomain lists, most of the time combined with word-lists.

Sit down, grab a coffee, and start testing a bunch of words to see which subdomain is alive. While it’s not the quickest way to find subdomains, it can be one of the most accurate.

### Running DNS zone transfers
A DNS zone transfer is another way to fully replicate a remote DNS zone. This is useful for revealing all the configured subdomains within the DNS server.

This technique works only when the DNS zone is not protected or limited by the system administrators for AXFR requests.

### Fetching SSL/TLS public information
SSL/TLS certificates are not only useful for encrypting the data sent and received between browsers and servers, it’s also useful for infosec research.

The Subject Alternate Name (SAN) of SSL/TLS certificates can be used to extract domains and subdomain names. This method, combined with python or bash scripting, can help you find subdomains quickly and easily.

* * *

## The best terminal-based subdomain scanner tools to find subdomains

### Aquatone
AQUATONE is a set of tools for performing reconnaissance on domain names. It can discover subdomains on a given domain by using open sources as well as the more common subdomain dictionary brute force approach. After subdomain discovery, AQUATONE can then scan the hosts for common web ports and HTTP headers, HTMLbodies and screenshots can be gathered and consolidated into a report for easy analysis of the attack surface.

##### Dependencies
AQUATONE depends on [Node.js] and [NPM] package manager for its web page screenshotting capabilities. Follow [this guide] for Installation instructions.

You will also need a newer version of Ruby installed. If you plan to use AQUATONE in [Kali] Linux, you are already set up with this. If not, it is recommended to install Ruby with [RVM].

Finally, the tool itself can be installed with the following command in a terminal:
```
$ gem install aquatone
```

#### Usage
*   Discovery

> The first stage of an AQUATONE assessment is the discovery stage where subdomains are discovered on the target domain using open sources, services and the more common dictionary brute force approach:
```
$ aquatone-discover --domain example.com
```

`aquatone-discover` will find the target's nameservers and shuffle DNS lookups between them. Should a lookup fail on the target domain's nameservers, aquatone-discover will fall back to using Google's public DNS servers to maximize discovery. The fallback DNS servers can be changed with the `--fallback-nameservers` option:
```
$ aquatone-discover --domain example.com --fallback-nameservers 87.98.175.85,5.9.49.12
```

*   Tuning

> `aquatone-discover` will use 5 threads as default for concurrently performing DNS lookups. This provides reasonable performance but can be tuned to be more or less aggressive with the `--threads` option:
```
$ aquatone-discover --domain example.com --threads 25
```

*   API Keys

> Some of the passive collectors will require API keys or similar credentials in order to work. Setting these values can be done with the `--set-key` option:
```
$ aquatone-discover --set-key shodan o1hyw8pv59vSVjrZU3Qaz6ZQqgM91ihQ
```
All keys will be saved in `~/aquatone/.keys.yml`.


* * *

### AMASS
Written by Jeff Foley, [Amass](https://github.com/OWASP/Amass) is one of our favorite tools when it comes to subdomain discovery. It’s one of the most powerful terminal-based commands there is for gathering and accumulating large amounts of subdomain data.

Amass uses a variety of subdomain mapping techniques including scrapping, recursive brute force, reverse NDS sweeping, and machine learning to get the full list of subdomains. It also includes [full integration with the SecurityTrails API](https://github.com/OWASP/Amass/blob/9ccc0c034eafca74a621ac6850d130f1faad5fa7/services/sources/securitytrails.go) for faster passive subdomain reconnaissance.

Installing Amass is easy by using the [precompiled packages](https://github.com/OWASP/Amass/releases), or by using snap on Kali Linux and other popular Linux distros, simply by typing:
```
snap install amass
```
Once you get it running, you can start playing. Let’s see how you can use it to find subdomains easily.

A basic subdomain scanning can be performing by running:
```
amass -d domain.com
```
Output example:

![](assets/amass.png)

You can also scan multiple domains with a single command:
```
amass enum -d mindsecurity.org,sans.org -d offensive-security.com
```
Other advanced scans can be found by running `amass --help`.

### Findomain
It tool doesn't use the common methods for sub(domains) discover, the tool uses [Certificate Transparency](https://www.kitploit.com/search/label/Certificate%20Transparency) logs to find subdomains and it method make it tool very faster and reliable. The tool make use of multiple public available APIs to perform the search. If you want to know more about Certificate Transparency logs, read [https://www.certificate-transparency.org/](https://www.certificate-transparency.org/).

#### - Installation Linux
If you want to install it, you can do that manually compiling the source or using the precompiled binary.
```sh
$ wget https://github.com/Edu4rdSHL/findomain/releases/latest/download/findomain-linux
$ chmod +x findomain-linux
$ ./findomain-linux --threads 25 -t mindsecurity.org
```
If you are using the [BlackArch Linux](https://blackarch.org/) distribution, you just need to use:
```sh
$ pacman -S findomain
```

![](assets/findomain.png)
