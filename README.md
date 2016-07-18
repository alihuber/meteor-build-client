Fork of [frozeman/meteor-build-client](https://github.com/frozeman/meteor-build-client) that could be runned as meteor package.


## Usage

Call the build method from the server side:

    import { meteorBuildClient } from 'meteor/jarnoleconte:build-client';
    
    meteorBuildClient({
        input: '/path/to/my/meteor/project',
        output: '.meteor-build',
        path: '/', 
        settings: _.pick(Meteor.settings, 'public'),
    });

### Output

The content of the output folder could look as follows:

- `index.html`
- `a28817fe16898311635fa73b959979157e830a31.css`
- `aeca2a21c383327235a08d55994243a9f478ed57.js`
- `...` (other files from your "public" folder)
