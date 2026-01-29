terraform {
  cloud {
    organization = "inspirehub" 
    workspaces {
      name = "inspirehub-develop"
    }
  }
}
