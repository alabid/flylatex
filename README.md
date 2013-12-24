FlyLatex
========

FlyLatex is a real-time collaborative environment for LaTeX built in nodejs.
It includes a beautiful LaTeX ACE Editor and a PDF renderer. 

FlyLatex gives you:

* A Real Time Collaborative Code Editor

* Real Time updates on status and privileges of Latex Documents

* Easy way to Compile LaTeX to PDF Online

* Easy LateX Debugging Online

* Easy Manipulation of Compiled PDFs

* Easy Sharing of PDFs

* An Open Source product that's easy to Customize

* Option to use images, additional packages (like .sty files) by specifying `configs.includes.path`

It's a free and open-source version of [ShareLatex](http://sharelatex.com).
Woot!

Screen Shots of the Internals of the FlyLatex application
---------------------------------------------------------

Check it out [here](http://blog.alabidan.me/?p=171)

Setup
-----

To use FlyLatex, you must have `node`, `npm`, `mongodb` installed. So if you haven't already installed all these, do so before moving on.

Also, if you want to store and render pdf's and not just edit your LaTeX
files, you must
have the program `pdflatex` command line tool installed. If not, install
it. FlyLatex stores compiled pdfs in the directory 
`config.directory.path` specified in `configs.js`.

To install FlyLatex, first clone the repository: `git clone https://github.com/alabid/flylatex.git`

`cd` into the directory `flylatex`. Open the file `configs.js` with your favorite
editor and edit the file to reflect your storage setup and your database
setup. Use `configs.pdfs.path` to specify where you want to store
your output pdfs in. Use `configs.includes.path` to specify what directory your TeX includes/packages/images are stored, for use during compilation of any LaTeX document.

    var config = {
        port: 3001
        , pdfs: {
          // absolute path of where to store compiled pdfs
          // defaults to "pdfs" directory in "flylatex" repo
          path: ""
        }
        , db : {
          // for example: mongodb://localhost/flydb3"
          url : "mongodb://localhost/flydb"
        }, docs: {
          // maximum number of documents per user
          MAX_NUM_PER_USER : 20
        }, includes: {
          // specify directory (absolute path) containing latex includes
          // defaults to "texpackages" directory in "flylatex" repo
          path: ""
        }  
    };

Then run the command `npm install -d` to install all the dependencies for the
FlyLatex nodejs app. This should take only a few minutes.

For more information on how to setup FlyLatex on Ubuntu, see
[this](http://kaanaksit.wordpress.com/2013/05/10/en-how-to-use-and-install-flylatex-on-ubuntu/)

Usage
-----

You'd have to first start the `mongo` daemon using the command

      mongod --dbpath <some mongodb path>

`<some mongodb path>` could be `~/mongodb` or any other place you have a mongodb
path.

Then `cd` into the directory (if you aren't already there) and run the command
 `foreman start`. This should invoke the `Procfile` in that directory (if you have the foreman gem installed) and start 
the server via:

    web: node app.js

You should see a command-line message telling you the port number on which the app lives. For example, I saw the message

    20:38:10 web.1     | Express server listening on port 5000 in development mode

So I had to visit `http://localhost:5000`. Yours might be different. Watch out.
    
If you don't have the foreman gem installed, start the app via `node app.js`.


Feedback, Bugs, Suggestions
---------------------------

I'd really like your feedback, comments, and bug reports sent to me
somehow preferably by filing an issue (github feature).


Author
------
Daniel Alabi

Version
-------
1.0

MIT Open Source License
-----------------------

Copyright &copy; 2012 Daniel Alabi

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.