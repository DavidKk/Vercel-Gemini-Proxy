export const createException = (message: string, result: any = message) => {
  return { failed: true, message, result }
}
