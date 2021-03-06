import {logInfo, logTrace, logWarn} from './logging'
import * as fs from 'mz/fs'
import {getTabChar} from './utils'

const schemaProperty = '$schema'

function addTemplateProp(obj, tmpl, templatePatterns) {
  const template = {
    type: 'string',
    minLength: 1
  }
  const pattern = templatePatterns[tmpl]
  if(pattern) template.pattern = pattern
  obj[tmpl] = template
}

function addTemplateGroup(obj, tmpl, templatePatterns) {
  const props = {}
  tmpl.items.forEach((t) => addTemplateProp(props, t, templatePatterns))
  obj[tmpl.group] = {
    type: 'object',
    properties: props,
    required: tmpl.items
  }
}

function jsonDiff(oldJson, newObj, logger) {
  if (oldJson) {
    try {
      const buildStats = () => {
        oldKeys = oldKeys.filter((name) => name !== schemaProperty)
        newKeys = newKeys.filter((name) => name !== schemaProperty)
        const count = newKeys.length
        const removed = oldKeys.filter((value) => newKeys.indexOf(value) === -1)
        const added = newKeys.filter((value) => oldKeys.indexOf(value) === -1)
        return { removed, added, count }
      }
      const lookupKeys = (obj) => {
        let keys = []
        if (obj.properties) {
          keys = Object.keys(obj.properties).map((key) => {
            const prop = obj.properties[key]
            if (prop.properties) {
              return Object.keys(prop.properties).map((name) => `${key}_${name}`)
            } else {
              return [key]
            }
          }).reduce(function (a, b) {
            return a.concat(b)
          }, [])
        }
        return keys
      }
      const oldObj = JSON.parse(oldJson)
      let oldKeys = lookupKeys(oldObj)
      let newKeys = lookupKeys(newObj)
      return buildStats()
    } catch (err) {
      logWarn(logger, err.message)
      logTrace(logger, err)
    }
  }
  let newKeys = Object.keys(newObj.properties || newObj.definitions.translations.properties || {})
  newKeys = newKeys.filter((name) => name !== schemaProperty)
  return { removed: [], added: newKeys, count: newKeys.length }
}

const generateSchema = ({templates, templatePatterns}) => {
  const props = {
    [schemaProperty]: {
      type: 'string'
    }
  }
  templates.forEach((tmpl) => (tmpl.group) ? addTemplateGroup(props, tmpl, templatePatterns) : addTemplateProp(props, tmpl, templatePatterns))
  return {
    type: 'object',
    properties: props,
    required: templates.map((t) => (t.group) ? t.group : t),
    additionalProperties: false
  }
}

/**
 * i18nTagSchema generates a JSON schema of all i18n tagged template literals in `srcPath`
 *
 * @param {Object} options - The export options.
 * @param {string} options.rootPath - The root directory of your source files.
 * @param {Object[]} [options.templates] - A regex to filter source files by name or extension. Defaults to `\.jsx?$`.
 * @param {Object} [options.templatePatterns] - A list of patterns to validate template properties.
 * @param {string} [options.schemaPath] - The target path of the JSON schema.
 * @param {logger} [options.logger] - A custom logger.
 * @param {number} [options.indention] - The number of spaces to be used instead of tabs. if not set tabs will be used.
 */
export const saveSchema = async ({rootPath, templates, templatePatterns, schemaPath, logger, indention}) => {
  const successMessage = 'i18n json schema has been generated'

  if (templates && templates.length) {
    const newSchema = generateSchema({templates, templatePatterns})
    const schemaString = JSON.stringify(newSchema, null, getTabChar(indention))

    if (schemaPath) {
      let prevJson
      if (await fs.exists(schemaPath)) {
        try {
          prevJson = await fs.readFile(schemaPath, 'utf-8')
        } catch (err) {
          logWarn(logger, err.message)
          logTrace(logger, err)
        }
      }
      await fs.writeFile(schemaPath, schemaString, 'utf-8')
      const diff = jsonDiff(prevJson, newSchema, logger)
      const message = `${successMessage}; contains ${diff.count} keys  ( ${diff.added.length} added / ${diff.removed.length} removed ): ${schemaPath}`
      logInfo(logger, message)
    } else {
      logInfo(logger, successMessage)
    }
    return newSchema
  } else {
    const emptySchema = '{}'
    logWarn(logger, `No i18n tagged template literals found in '${rootPath}'`)
    if (schemaPath) {
      await fs.writeFile(schemaPath, emptySchema, 'utf-8')
    }
    return {}
  }
}
