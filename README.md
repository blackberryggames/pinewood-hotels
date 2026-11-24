# Night Desk (browser build)

Hollow Pines Hotel, November 1999. Low-poly checkpoint horror that runs entirely in the browser:
Three.js models, ElevenLabs voices and sound effects are all included in this folder.

## Put it on GitHub Pages

1. Create a new repository on GitHub (public, or private with Pages enabled on your plan).
2. Upload **everything in this folder** to the root of the repository
   (`index.html` must sit at the top level, next to `main.js`).
   The web uploader works: drag the folder contents onto "Add file → Upload files".
3. In the repo go to **Settings → Pages**, set *Source* to **Deploy from a branch**,
   branch **main**, folder **/ (root)**, and save.
4. After a minute the game is live at `https://<your-name>.github.io/<repo-name>/`.

The empty `.nojekyll` file tells GitHub to serve the files as-is. Keep it.

## Run it locally

Browsers block module scripts and audio loading from `file://`, so serve the folder:

```
python -m http.server 8765
```

then open http://localhost:8765 in your browser.

## Credits

See the credits line on the title screen ("Proportional Low Poly Man" by Robin Butler and
"Low Poly Female Base Mesh" by Mesh-Base, both CC-BY-4.0, via Sketchfab).
