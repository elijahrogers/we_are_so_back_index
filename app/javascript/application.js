// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import "@hotwired/turbo-rails"
import "controllers"
import "texture_animation"
import posthog from 'posthog-js'

if (document.documentElement.dataset.loadPosthog === 'true') {
  posthog.init('phc_UdBnQLzPDAJjWCASH0IhLK99eaL2El70RrOLmRI2BRg',
    {
      api_host: 'https://us.i.posthog.com',
      person_profiles: 'memory'
    }
  )
}
