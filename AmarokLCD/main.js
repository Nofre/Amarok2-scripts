Importer.loadQtBinding("qt.core");
var amaroklcd = 'python ' + Amarok.Info.scriptPath() + '/amaroklcd.py';
var script = new QProcess();
script.start(amaroklcd);
