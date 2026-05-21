## Flyway in this project

1. Edit `database/flyway/flyway.user.toml` with your real JDBC connection.
2. Put versioned migrations in `database/flyway/sql`.
3. Run Flyway through `run-flyway.cmd` from the project root.

Examples:

```bat
run-flyway.cmd version
run-flyway.cmd info
run-flyway.cmd migrate
run-flyway.cmd validate
run-flyway.cmd repair
```

Migration naming:

- `V1__init_schema.sql`
- `V2__add_user_table.sql`
- `R__refresh_views.sql`
