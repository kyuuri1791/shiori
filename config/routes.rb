Rails.application.routes.draw do
  resource :session
  resource :registration, only: %i[new create]

  root "user_shelf_items#index"
  resources :user_shelf_items, only: :index
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

  namespace :admin do
    root "users#index"
    resources :users, only: :index do
      resource :approval, only: %i[create destroy]
    end
  end

  namespace :api do
    resources :user_shelf_items, only: %i[index create update destroy]
    resource :user_shelf_items_bulk, only: :create, controller: "user_shelf_items_bulk"
    resources :ai_searches, only: %i[create show]
    resources :book_matches, only: :create
    resources :shelf_photo_scans, only: %i[create show]
    resources :books, only: [] do
      collection do
        get :search
        get :lookup
      end
    end

    namespace :public do
      resources :users, only: [] do
        resources :user_shelf_items, only: :index
      end
      resources :books, only: [] do
        get :search, on: :collection
      end
    end
  end

  get "up" => "rails/health#show", as: :rails_health_check
end
