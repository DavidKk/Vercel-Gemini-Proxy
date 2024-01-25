# Vercel Gemini Proxy

Gemini API proxy on Vercel Edge is a proxy service designed to address issues of slow or inaccessible access to the Gemini API in certain regions.

## Background

Due to network conditions and geographical locations, access to the Gemini API can be slow or even impossible in some regions. To resolve this issue, we have created the Vercel Gemini Proxy, which allows users in these regions to access the Gemini API more quickly and reliably.

## Important Notes

- This service must have its own domain name. Without a domain name, requests cannot be sent. Also, please try to set your DNS resolution in a region where Gemini allows access for successful connectivity.
- The project requires a Gemini Token. Please set up and use your own token, and refrain from using tokens from others to prevent unauthorized use of the service.

## Deploy With Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDavidKk%2Fvercel-gemini-proxy)

## Usage

```bash
$ curl "http://$YOU_SERVER_HOST:$PORT/api/v1beta/models/gemini-pro:streamGenerateContent?key=$GEMINI_API_TOKEN" \
  -H "Content-Type: application/json" \
  -H 'cache-control: no-cache' \
  --data-raw '{"contents":[{"role":"user","parts":[{"text":"Hello Gemini"}]}]}'
  --compressed
```
