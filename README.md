[![build.workflow](https://github.com/DavidKk/vercel-gemini-proxy/actions/workflows/coverage.workflow.yml/badge.svg)](https://github.com/DavidKk/vercel-gemini-proxy/actions/workflows/coverage.workflow.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![codecov](https://codecov.io/gh/DavidKk/vercel-gemini-proxy/graph/badge.svg?token=ELV5W1H0C0)](https://codecov.io/gh/DavidKk/vercel-gemini-proxy)

# Vercel Gemini Proxy

[![中文](https://img.shields.io/badge/%E6%96%87%E6%A1%A3-%E4%B8%AD%E6%96%87-green?style=flat-square&logo=docs)](https://github.com/DavidKk/vercel-gemini-proxy/blob/main/README.zh-CN.md) [![English](https://img.shields.io/badge/docs-English-green?style=flat-square&logo=docs)](https://github.com/DavidKk/vercel-gemini-proxy/blob/main/README.md)

Gemini API proxy on Vercel Edge is a proxy service designed to address issues of slow or inaccessible access to the Gemini API in certain regions.

## Background

Due to network conditions and geographical locations, access to the Gemini API can be slow or even impossible in some regions. To resolve this issue, we have created the Vercel Gemini Proxy, which allows users in these regions to access the Gemini API more quickly and reliably.

## Important Notes

- This service must have its own domain name. Without a domain name, requests cannot be sent. Also, please try to set your DNS resolution in a region where Gemini allows access for successful connectivity.
- The project requires a `Gemini API Token`. Please set up and use your own token, and refrain from using tokens from others to prevent unauthorized use of the service.
- If the `role` of the last or the first message in the message context is not `user`, the error `Please ensure that multiturn requests ends with a user role or a function response.` may occur. Therefore, if the `role` of the first message is not `user`, the service will automatically delete the first (ie. the first) message. If the `role` of the last message is not user, an error will be reported and the message will not be sent to Gemini.
- Only when the parameters meet all the conditions of `body`, `key` and `Method`, can a normal request be made, otherwise a `401` error will be returned.
- Since Vercel may interrupt data, the service will first return a `200` status, wait for Gemini's reply, and return it to the user in the form of a stream.
- You can check the log situation through the Vercel console Log.

## Deploy With Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDavidKk%2Fvercel-gemini-proxy)

## Usage

```bash
$ curl "http://$YOU_SERVER_HOST:$PORT/api/v1beta/models/gemini-pro:streamGenerateContent?key=$GEMINI_API_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-vercel-protection-bypass: $VERCEL_SECRET" \
  -H 'cache-control: no-cache' \
  --data-raw '{"contents":[{"role":"user","parts":[{"text":"Hello Gemini"}]}]}' \
  --compressed
```

### Parameters

**GEMINI_API_TOKEN**: Gemini API KEY

Apply for a Google app, add Gemini, and get API keys.

**VERCEL_SECRET**: User Limitation

Refer to the `Deployment Protection` > `Protection Bypass for Automation` settings in Vercel.
