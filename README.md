jquery-crud-plugin
==================

jQuery plugin for creating forms from JSON or JSON schemas

Even though this repo is new, the code here is some number of years old. It
exists for reference purposes only.

Seriously, move along.

Still here? Okay, fine...

## Try out auto-form generation

Open test.html in Firefox. (Chrome will not allow local AJAX. On a server,
you're fine though.) Paste in a JSON schema or JSON data or both, and voila,
automatic forms!

Note that JSON schemas must be version 03. Hey, version 04 didn't exist when
this was made!

https://tools.ietf.org/html/draft-zyp-json-schema-03

## Try out a more comprehensive example.

Open list.html in Firefox. (Same notes about Chrome as above.) This example
hooks up the crud plugin to JSON services (just local JSON files for the
example). Clicking the links will take you to other pages that also invoke the
crud plugin for edit and view.
