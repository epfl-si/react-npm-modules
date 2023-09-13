This is a [Yarn monorepo](https://yarnpkg.com/features/workspaces) for a number of public NPM packages whose name looks like `@epfl-si/*react*`.

# Instructions for Specific Development Tasks

## Add a changelog entry

<pre>yarn changeset
</pre>

## Aggregate changelog entries and prepare for new releases

<pre>yarn changeset version
git commit -a
</pre>


## Publish everything

<pre>yarn release
</pre>
