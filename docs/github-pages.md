# Deploying on GitHub pages

[GitHub pages][gh-pages] is a service by GitHub for hosting your website on
GitHub's `github.io` domain. GitHub provides access to the working copy of
the `gh-pages` branch in a Git repository. In addition to the files that are
commited to this branch, GitHub can also [render static sites][gh-jekyll] from
Jekyll template files. We won't make use of that feature though.

## Creating the gh-pages branch

GitHub [recommends][gh-pages-branch] creating an orphaned branch for the
hosting of on GitHub Pages. Since the `master` branch is actually exactly
what we want to see hosted, we'll ignore that recommendation and just create
it by branching off from `master`:

```console
$ git checkout master
$ git checkout -b gh-pages
Switched to a new branch 'gh-pages'
```

## Which files to commit

We now have an exact copy of the latest `master` copy at `gh-pages`. To run
the application without _Grunt_ we need some more files that are usually not
commited:

- `bower_components`: This is where all external libraries are stored.  
  We could omit that directory if we were only using the bundled `index.html`
  of our application, because in that case, all libraries would be bundled
  with the application's source code into a single `.js` file.
- `var`: This is where the [`grunt-laxar`][grunt-laxar] toolchain stores all
  files that are created when bundling the application. (These are essential
  if we want anything at all to work.)

Some other files, like the `Gruntfile.js` or the `package.json` are not
strictly needed, when deploying the application, but they don't get in the
way either, so we'll leave them there.

### The .gitignore file

The directories above are usually listed in the `.gitignore` file to mark
them for exclusion from the repository. _On the `gh-pages` branch_ however,
we'll remove those lines, so we can commit the `bower_components` and `var`
directories.

### Commiting the changes and pushing them to GitHub

After editing the `.gitignore` file, we can make sure, we have the latest
version of our application bundled for deployment, and add all the files
we need to the Git repository:

```console
# Update dependencies and bundle the application
$ npm install
$ npm run-script optimize

# Add and commit the files
$ git add .gitignore bower_components var
$ git commit

# Push the gh-pages branch to GitHub
$ git push -u origin gh-pages
Branch gh-pages set up to track remote branch gh-pages from origin.
```

## Updating the gh-pages branch

## Looking at the results

[gh-pages]: https://pages.github.com "GitHub Pages"
[gh-jekyll]: https://help.github.com/articles/using-jekyll-with-pages/ "Using Jekyll with Pages – GitHub User Documentation"
[gh-pages-branch]: https://help.github.com/articles/creating-project-pages-manually/#create-a-gh-pages-branch "Creating Project Pages manually – GitHub User Documentation"
[grunt-laxar]: https://github.com/LaxarJS/grunt-laxar "Grunt tasks for LaxarJS – GitHub"
