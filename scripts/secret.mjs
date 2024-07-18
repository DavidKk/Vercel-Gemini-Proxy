import crypto from 'crypto'

const secretKey = crypto.randomBytes(16).toString('hex')
// eslint-disable-next-line no-console
console.log('Secret Key:', secretKey)
