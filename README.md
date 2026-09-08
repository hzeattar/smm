# SMM Railway Scaffold

Railway-ready deployment scaffold for a licensed PHP / CodeIgniter 3 application.

## Included

- Dockerfile based on PHP 7.4 + Apache
- Apache `mod_rewrite`
- MySQL / MariaDB extensions
- Composer support
- Dynamic Railway `$PORT`
- Railway MySQL environment-variable mapping
- Production PHP settings

## Railway setup

1. Connect this GitHub repository to a Railway service.
2. Add a Railway MySQL service to the same project.
3. Railway normally exposes these variables automatically to the MySQL service:
   - `MYSQLHOST`
   - `MYSQLPORT`
   - `MYSQLUSER`
   - `MYSQLPASSWORD`
   - `MYSQLDATABASE`
4. In the web service, expose/reference the MySQL variables above if they are not already available.
5. Set:
   - `APP_URL=https://YOUR-PUBLIC-DOMAIN/`
   - `APP_TIMEZONE=Africa/Cairo`
   - `APP_ENCRYPTION_KEY=<strong-random-secret>`
6. Add the licensed application source at repository root, with `index.php` and the `app/` directory in the expected CodeIgniter layout.
7. Deploy. Railway will build using `Dockerfile` automatically.

## Notes

The runtime entrypoint maps Railway MySQL variables to the legacy `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, and `DB_NAME` constants expected by the application.

Do not commit `.env`, database dumps, API credentials, payment secrets, or unknown obfuscated remote-loader code.
