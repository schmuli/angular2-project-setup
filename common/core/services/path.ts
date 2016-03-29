import * as _ from 'lodash';

var _path: string = '';
export var PathService = {
    getRelativePath(filePath) {
        if (!_path) {
            this.setPath();
        }
        return _path + filePath;
    },
    setPath() {
        var seps = window.location.pathname
            .split("/")
            .filter(x => !!x)
            .length;

        _path = _.repeat("../", seps);
    }
}