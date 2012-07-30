FlyLatex
========

FlyLatex is a Real Time Collaborative Environment for LaTeX built in nodejs.
It includes a beautiful LaTeX ACE Editor and a PDF renderer. 

FlyLatex gives you:

* A Real Time Collaborative Code Editor

* Real Time updates on status and privileges of Latex Documents

* Easy way to Compile LaTeX to PDF Online

* Easy LateX Debugging Online

* Easy Manipulation of Compiled PDF

* Easy Sharing of PDF

* An Open Source product that's easy to Customize



Setup
-----

To use FlyLatex, you must have `node`, `npm`, and `mongodb` installed. So if you haven't already installed node (for nodejs) and npm (the node package manager), 
do so before moving on.

Also, if you want to be able to store and render pdf's and not just edit your LaTeX
files, then sign up for a cloud storage service like 
[Amazon S3](http://aws.amazon.com/es/s3/). 
Other providers should be accessible in the future.

To install FlyLatex, first clone the repository: `git clone https://github.com/alabid/flylatex.git`

`cd` into the directory `flylatex`. Open the file `configs.js` with your favorite
editor and edit the file to reflect your cloud storage setup and your database
setup.

	var config = {
  	    attachments : {
	        directory : "pdfs"
	   	, providerName : "<provider name here>" // for example "s3"
	    	, key : "<your key here>"  // your access id key
	    	, secret : "<your secret here>" // your s3 secret key
	    	, bucket : "<your bucket here>" // amazon s3 bucket name
   	    }
	    , db : {
	      url : "<your mongodb database url>" // for example: mongodb://localhost/flydb" 
    	    }
	};

Then run the command `npm install -d` to install all the dependencies for the
FlyLatex nodejs app. This should take only a few minutes.

Usage
-----

You'd have to first start the `mongo` daemon using the command

      mongod --dbpath <some mongodb path>

`<some mongodb path>` could be `~/mongodb` or any other place you have a mongodb
path.

Then `cd` into the directory (if you aren't already there) and run the command
 `foreman start`. This should invoke the `Procfile` in that directory and start 
the server via:

   web: node app.js



Feedback, Bugs, Suggestions
---------------------------

I'd really like your feedback, comments, and bug reports sent to me
somehow preferably by filing an issue (github feature).


Author
------
Daniel Alabi

Version
-------
0.5.0-Beta

MIT Open Source License
-----------------------

Copyright &copy 2012 Daniel Alabi

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.