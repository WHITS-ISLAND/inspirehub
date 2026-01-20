// Atlas configuration for D1 (SQLite)

env "local" {
  src = "file://schema.sql"
  dev = "sqlite://dev?mode=memory"

  migration {
    dir = "file://migrations"
  }
}

env "d1" {
  src = "file://schema.sql"

  migration {
    dir = "file://migrations"
  }
}
