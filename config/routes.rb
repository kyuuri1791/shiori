Rails.application.routes.draw do
  resource :session

  root "books#index"
  resources :books, only: :index
  resources :shelves, only: :show
  resources :users, only: :index

  namespace :api do
    resources :books, only: :index do
      post :batch, on: :collection
    end
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
      resources :shelves, only: :show
      resources :editions, only: [] do
        get :search, on: :collection
      end
    end
  end

  get "up" => "rails/health#show", as: :rails_health_check
end
