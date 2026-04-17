module.exports = {
    moduleNameMapper: {
        // package.json and "type":"module" requires import statements to use .js extension. Which then doesn't work for UTs. This is undo for UTs.
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
};
