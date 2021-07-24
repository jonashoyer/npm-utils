## NPM Utils

### Install
Clone the repo and run `npm i -g` in the root

### clean-modules
``npx clean-modules [-d DAYS] [-c]``

Delete unused node_modules at the current path
#### Arguments:
- ``-d DAYS`` specify the minimum amount of days since last used (default 30 days)
- ``-c`` calculate node modules data size (will increase runtime significantly)