# Vercel Gemini 代理

[![中文](https://img.shields.io/badge/%E6%96%87%E6%A1%A3-%E4%B8%AD%E6%96%87-green?style=flat-square&logo=docs)](https://github.com/your-project/your-project-repo/blob/main/docs/zh-CN/README.md) [![English](https://img.shields.io/badge/docs-English-green?style=flat-square&logo=docs)](https://github.com/your-project/your-project-repo/blob/main/docs/en-US/README.md)

Vercel Edge 上的 Gemini API 代理是一项代理服务，旨在解决某些地区访问 Gemini API 速度慢或无法访问的问题。

## 背景

由于网络状况和地理位置的原因，在某些地区访问 Gemini API 的速度可能很慢，甚至根本无法访问。为了解决这个问题，我们创建了 Vercel Gemini 代理，它允许这些地区的用户更快、更可靠地访问 Gemini API。

## 重要须知

- 此服务必须有自己的域名。如果没有域名，则无法发送请求。此外，请尝试在 Gemini 允许访问的区域中设置您的 DNS 解析，以实现成功的连接。
- 该项目需要一个 `Gemini API Token`。请设置并使用您自己的令牌，不要使用他人的令牌，以防止未经授权使用该服务。
- 如果消息上下文最后一条信息或第一条信息 `role` 不为 `user` 时，可能会出现 `Please ensure that multiturn requests ends with a user role or a function response.` 错误。因此若第一条信息 `role` 不为 `user`时，服务会自动删除第一条（即第一条）信息。若最后一条信息 `role` 不为 `user` 时，将会报错不会将信息发送给 `Gemini`。
- 仅当参数都满足条件 `body`、`key` 和 `Method`，才能正常请求，否则均返回 `401` 错误。
- 由于 Vercel 可能会中断数据，因此服务会优先返回 `200` 状态，且等待 Gemini 的回复，并通过流的形式返回给用户。

## 使用 Vercel 部署

[![使用 Vercel 部署](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDavidKk%2Fvercel-gemini-proxy)

## 用法

```bash
$ curl "http://$YOU_SERVER_HOST:$PORT/api/v1beta/models/gemini-pro:streamGenerateContent?key=$GEMINI_API_TOKEN" \
  -H "Content-Type: application/json" \
  -H 'cache-control: no-cache' \
  --data-raw '{"contents":[{"role":"user","parts":[{"text":"你好 Gemini"}]}]}'
  --compressed
```
