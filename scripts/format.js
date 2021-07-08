const { exec } = require('child_process')

exec(`yarn prettier-eslint --write '${process.cwd()}/packages/**/src/**/*.ts'`, (err, stdout) => {
  if (err) {
    console.log(`Error running prettier-eslint: ${err}`)
  }
  console.log(stdout)
})
