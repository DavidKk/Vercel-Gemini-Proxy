import path from 'path'
import ts from 'typescript'

/** 解析 tsconfig 文件 */
export const parseTSConfig = (configFile = 'tsconfig.json') => {
  const configPath = ts.findConfigFile('./', ts.sys.fileExists, configFile)!
  const readConfigFile = ts.readJsonConfigFile(configPath, ts.sys.readFile)
  const parseConfigHost: ts.ParseConfigHost = {
    useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
    readDirectory: ts.sys.readDirectory,
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
  }

  return ts.parseJsonSourceFileConfigFileContent(readConfigFile, parseConfigHost, path.dirname(configPath))
}
