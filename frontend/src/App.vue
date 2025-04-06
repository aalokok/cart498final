<template>
  <div id="app">
    <b-navbar toggleable="md" type="dark" variant="dark">
      <b-container>
        <b-navbar-brand to="/">The Actual Informer</b-navbar-brand>
        
        <b-navbar-toggle target="nav-collapse"></b-navbar-toggle>
        
        <b-collapse id="nav-collapse" is-nav>
          <b-navbar-nav class="ml-auto">
            <b-nav-item to="/" exact>Home</b-nav-item>
            <b-nav-item to="/about">About</b-nav-item>
          </b-navbar-nav>
        </b-collapse>
      </b-container>
    </b-navbar>
    
    <main>
      <router-view/>
    </main>
    
    <footer class="bg-dark text-white py-4 mt-5">
      <b-container>
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-center">
          <div class="mb-3 mb-md-0">
            <h5>The Actual Informer</h5>
            <p class="mb-0 small">A satirical exploration of AI-generated media</p>
          </div>
          
          <div class="text-center text-md-right">
            <p class="mb-0 small">&copy; {{ new Date().getFullYear() }} The Actual Informer</p>
            <p class="mb-0 small">This is a student project - not a real news site</p>
          </div>
        </div>
      </b-container>
    </footer>
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
body {
  min-height: 100vh;
  font-family: 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f8f9fa;
}

main {
  min-height: calc(100vh - 200px);
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

main {
  flex: 1;
}

.btn {
  font-weight: 500;
}
</style>
