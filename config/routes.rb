Rails.application.routes.draw do
  resource :session

  root "books#index"
  resources :books, only: :index
  resources :users, only: %i[index show]
  namespace :bulk_imports do
    resources :photos, only: %i[new create] do
      collection do
        post :confirm
        get :complete
      end
    end
    resources :series, only: %i[new create] do
      collection do
        post :confirm
        get :complete
      end
    end
  end

  namespace :api do
    resources :books, only: %i[index create update destroy]
    resource :books_bulk, only: :create, controller: "books_bulk"
    resources :ai_searches, only: %i[create show]
    resources :edition_matches, only: :create
    resources :shelf_photo_scans, only: %i[create show]
    resources :editions, only: [] do
      collection do
        get :search
        get :lookup
      end
    end

    namespace :public do
      resources :users, only: [] do
        resources :books, only: :index
      end
      resources :editions, only: [] do
        get :search, on: :collection
      end
    end
  end

  get "up" => "rails/health#show", as: :rails_health_check
end
