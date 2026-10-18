module ViteHelper
  SOURCE_DIR = "app/client"
  STYLESHEET_DIR = "app/assets/stylesheets"

  def vite_entry_tags(entry)
    return if skip_vite_tags?

    source = "#{SOURCE_DIR}/#{entry}"

    if (dev = vite_dev_server_url)
      safe_join([
        tag.script(<<~JS.html_safe, type: "module"),
          import RefreshRuntime from "#{dev}/@react-refresh"
          RefreshRuntime.injectIntoGlobalHook(window)
          window.$RefreshReg$ = () => {}
          window.$RefreshSig$ = () => (type) => type
          window.__vite_plugin_react_preamble_installed__ = true
        JS
        vite_client_tag(dev),
        tag.script(src: "#{dev}/#{source}", type: "module")
      ])
    else
      chunk = ViteHelper.manifest.fetch(source)
      tags = chunk.fetch("css", []).map { tag.link(rel: "stylesheet", href: "/vite/#{it}") }
      tags << tag.script(src: "/vite/#{chunk.fetch("file")}", type: "module")
      safe_join(tags)
    end
  end

  def vite_stylesheet_tag(entry)
    return if skip_vite_tags?

    source = "#{STYLESHEET_DIR}/#{entry}"
    return tag.link(rel: "stylesheet", href: "/vite/#{ViteHelper.manifest.fetch(source).fetch("file")}") unless (dev = vite_dev_server_url)

    safe_join([ vite_client_tag(dev), tag.link(rel: "stylesheet", href: "#{dev}/#{source}") ])
  end

  def self.manifest
    @manifest = nil unless Rails.env.production?
    @manifest ||= JSON.parse(Rails.public_path.join("vite/.vite/manifest.json").read)
  end

  private
    def skip_vite_tags?
      Rails.configuration.x.vite.skip_tags == true
    end

    def vite_client_tag(dev)
      return if @vite_client_included

      @vite_client_included = true
      tag.script(src: "#{dev}/@vite/client", type: "module")
    end

    def vite_dev_server_url
      ENV["VITE_DEV_SERVER_URL"].presence if Rails.env.development?
    end
end
