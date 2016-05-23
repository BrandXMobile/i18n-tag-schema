// i18n-tag-schema.d.ts

declare module 'i18n-tag-schema' {
    /**
     * Generates a JSON schema based on i18n tagged template literals
     * If no target schema is provided the json will be returned via callback output param
     *
     * @param path Base path of the source directory.
     * @param filter File extension filter as regex string.
     * @param schema Path to the generated .json file.
     * @param callback A callback function.
     */
    function func(path: string, filter: string, schema: string, callback: (output: string) => void)
    export = func
}