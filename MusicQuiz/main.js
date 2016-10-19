Importer.loadQtBinding("qt.core");
Importer.loadQtBinding("qt.gui");
Importer.loadQtBinding("qt.uitools");


//UI
var UIloader = new QUiLoader(this);
var uiFile = new QFile (Amarok.Info.scriptPath() + "/main.ui");
var uiFile2 = new QFile (Amarok.Info.scriptPath() + "/config.ui");
uiFile.open(QIODevice.ReadOnly);
uiFile2.open(QIODevice.ReadOnly);
dialog = UIloader.load(uiFile,this);
dialog_config = UIloader.load(uiFile2,this);
var icon = new QPixmap(Amarok.Info.scriptPath() + "/musicquiz.png");
dialog.mq_icon.setPixmap(icon);

//Set Language
var file = QLocale.system().name().substring(0,2)+".js";
if (QFile.exists(Amarok.Info.scriptPath()+"/translations/"+file)) {
	Importer.include("translations/"+file);
}else{
	Importer.include("translations/en.js");
}


dialog.quit.text = string_quit;
dialog.start.text = string_start;
dialog.time_bar.format = string_time_bar;
dialog.personalize.text = string_personalize;
dialog_config.group1.label1.text = string_ask;
dialog_config.group2.label2.text = string_num_questions;

//Variables
var question;
var correct_option = 0;
var songs = 0;
var correct_answers = 0;
var tracks = 0;
var track_number;
var correct_answer = "";
var array_questions = [];
var number_questions;
var ask_title;
var ask_artist;
var ask_album;
var ask_year;
var ask_genre;
var questions_about;
var playlist;

//Load Configuration
function loadConfig(){
	number_questions = parseInt(Amarok.Script.readConfig("number_questions","20"));
	ask_title = parseInt(Amarok.Script.readConfig("ask_title","2"));
	ask_artist = parseInt(Amarok.Script.readConfig("ask_artist","2"));
	ask_album = parseInt(Amarok.Script.readConfig("ask_album","2"));
	ask_year = parseInt(Amarok.Script.readConfig("ask_year","2"));
	ask_genre = parseInt(Amarok.Script.readConfig("ask_genre","2"));	
}

loadConfig();

if (ask_title == 2){
	dialog_config.group1.check_title.setChecked(true);
}
if (ask_artist == 2){
	dialog_config.group1.check_artist.setChecked(true);
}
if (ask_album == 2){
	dialog_config.group1.check_album.setChecked(true);
}
if (ask_year == 2){
	dialog_config.group1.check_year.setChecked(true);
}
if (ask_genre == 2){
	dialog_config.group1.check_genre.setChecked(true);
}

dialog_config.group2.questions.setValue(number_questions);

//Connections
dialog.start.clicked.connect(function() {

	var artists = Amarok.Collection.query("SELECT `name` FROM `artists`")+"";
	var list_artists = artists.split(",");
	dialog.group_places.artists.addItems(list_artists);

	dialog.start.hide();
	dialog.personalize.show();
	dialog.mq_icon.hide();
	dialog.question.text = string_about;
	dialog.label2.text = "";
	dialog.group_places.show();

});

dialog.quit.clicked.connect(hideDialog);
dialog.personalize.clicked.connect(function() {dialog_config.show();});
dialog_config.buttonBox.button(QDialogButtonBox.Apply).clicked.connect(saveConfig);


dialog.group_places.collection.clicked.connect(function() {
	questions_about = 0;
	startQuiz();
});

dialog.group_places.playlist.clicked.connect(function() {
	if (Amarok.Playlist.totalTrackCount() != 0){
		questions_about = 1;
		startQuiz();
	}
});

dialog.group_places.artist.clicked.connect(function() {
	if (dialog.group_places.artists.currentIndex != 0){
		questions_about = 2;
		startQuiz();
	}
});


dialog.group_options.option1.clicked.connect(function() {
	if (dialog.group_options.option1.text == correct_answer){
		optionClicked(1);
	}else{
		optionClicked(0);
	}
});

dialog.group_options.option2.clicked.connect(function() {
	if (dialog.group_options.option2.text == correct_answer){
		optionClicked(1);
	}else{
		optionClicked(0);
	}
});


dialog.group_options.option3.clicked.connect(function() {
	if (dialog.group_options.option3.text == correct_answer){
		optionClicked(1);
	}else{
		optionClicked(0);
	}
});

dialog.group_options.option4.clicked.connect(function() {
	if (dialog.group_options.option4.text == correct_answer){
		optionClicked(1);
	}else{
		optionClicked(0);
	}
});

//Timers
timer = new QTimer();
timer.timeout.connect(function(){
	if (dialog.time_bar.value > 0){
		dialog.time_bar.value -= 1;
	}else{
		optionClicked(0);		
	}	
});

timer2 = new QTimer();
timer2.timeout.connect(function() {quiz(track_number); });

function random_number(first,count) {
		return Math.floor(Math.random()*count)+first;
}


function saveConfig() {
	Amarok.Script.writeConfig("ask_title",dialog_config.group1.check_title.checkState()+"");
	Amarok.Script.writeConfig("ask_artist",dialog_config.group1.check_artist.checkState()+"");
	Amarok.Script.writeConfig("ask_album",dialog_config.group1.check_album.checkState()+"");
	Amarok.Script.writeConfig("ask_year",dialog_config.group1.check_year.checkState()+"");
	Amarok.Script.writeConfig("ask_genre",dialog_config.group1.check_genre.checkState()+"");
	Amarok.Script.writeConfig("number_questions",dialog_config.group2.questions.value+"");

	loadConfig();	

	dialog_config.hide();
}

function showDialog() {
	var script = new QProcess();
	script.start("qdbus org.kde.amarok /amarok/MainWindow hide");
	dialog.group_options.hide();
	dialog.group_counter.hide();
	dialog.group_places.hide();
	dialog.time_bar.hide();
	dialog.question.text = "";
	dialog.label2.text = "";
	dialog.mq_icon.show();
	dialog.start.show();
	dialog.personalize.show();
	dialog.show();
}

function hideDialog() {
	timer.stop()
	timer2.stop()
	var script = new QProcess();
	script.start("qdbus org.kde.amarok /amarok/MainWindow show");
	Amarok.Engine.Stop(true);
	dialog.hide();
}


function startQuiz() {
	if (questions_about != 1){
		Amarok.Playlist.clearPlaylist();
	}
	dialog.time_bar.value = 20;
	songs = 0;
	array_questions = [];
	dialog.group_counter.songs.text = songs;
	correct_answers = 0;
	dialog.group_counter.correct_answers.text = correct_answers;
	dialog.group_counter.show();
	dialog.group_places.hide();
	dialog.personalize.hide();
	dialog.time_bar.show();	


	if (ask_title == 2){
		array_questions.push(1);
	}
	if (questions_about != 2){
		if (ask_artist == 2){
			array_questions.push(2);
		}
	}
	if (ask_album == 2){
		array_questions.push(3);
	}
	if (ask_year == 2){
		array_questions.push(4);
	}
	if (ask_genre == 2){
		array_questions.push(5);
	}
	if (array_questions.length == 0){
		array_questions.push(1);
	}

	quiz(0);
}


function quiz(previous_track_number){
	if (songs != number_questions) {
		dialog.group_options.show();
		dialog.label2.text = "";
		question = array_questions[random_number(0,array_questions.length)];


		switch(questions_about){
			case 0:
				tracks = Amarok.Collection.totalTracks();
				do
					track_number = random_number(1,tracks);
				while(track_number == previous_track_number);
		
				var url = Amarok.Collection.query("SELECT `rpath` FROM `urls` WHERE `id`=#".replace("#",track_number))+"";
				Amarok.Playlist.playMedia(new QUrl(url));
				Amarok.Playlist.removeCurrentTrack();


				switch(question){
					case 1:
						dialog.question.text = q1;				
						correct_answer = Amarok.Engine.currentTrack().title;
						var sql_title = "SELECT `title` FROM `tracks` WHERE `id`=#";

						do
							var wrong_answer1 = Amarok.Collection.query(sql_title.replace("#",random_number(1,tracks)));
						while (correct_answer == wrong_answer1);

						do
							var wrong_answer2 = Amarok.Collection.query(sql_title.replace("#",random_number(1,tracks)));
						while (correct_answer == wrong_answer2);

						do
							var wrong_answer3 = Amarok.Collection.query(sql_title.replace("#",random_number(1,tracks)));
						while (correct_answer == wrong_answer3);
						break;
	
				 	case 2:
						dialog.question.text = q2;
						correct_answer = Amarok.Engine.currentTrack().artist;
						var sql_artist = "SELECT `name` FROM `artists` WHERE `id`=#";
				
						var wrong_answer1 = Amarok.Collection.query(sql_artist.replace("#",random_number(1,Amarok.Collection.totalArtists())));
						var wrong_answer2 = Amarok.Collection.query(sql_artist.replace("#",random_number(1,Amarok.Collection.totalArtists())));
						var wrong_answer3 = Amarok.Collection.query(sql_artist.replace("#",random_number(1,Amarok.Collection.totalArtists())));
						break;
		
					case 3:
						dialog.question.text = q3;				
						correct_answer = Amarok.Engine.currentTrack().album;
						var sql_album = "SELECT `name` FROM `albums` WHERE `id`=#";
				
						var wrong_answer1 = Amarok.Collection.query(sql_album.replace("#",random_number(1,Amarok.Collection.totalAlbums())));
						var wrong_answer2 = Amarok.Collection.query(sql_album.replace("#",random_number(1,Amarok.Collection.totalAlbums())));
						var wrong_answer3 = Amarok.Collection.query(sql_album.replace("#",random_number(1,Amarok.Collection.totalAlbums())));
						break;
				
					case 4:
						dialog.question.text = q4;
						correct_answer = Amarok.Engine.currentTrack().year;
						var years = (Amarok.Collection.query("SELECT `name` FROM `years`")+"").split(",");
				
						var wrong_answer1 = years[random_number(0,years.length)];
						var wrong_answer2 = years[random_number(0,years.length)];
						var wrong_answer3 = years[random_number(0,years.length)];
						break;

					case 5:
						dialog.question.text = q5;
						correct_answer = Amarok.Engine.currentTrack().genre;
						var sql_genre = "SELECT `name` FROM `genres` WHERE `id`=#";

						var wrong_answer1 = Amarok.Collection.query(sql_genre.replace("#",random_number(1,Amarok.Collection.totalGenres())));
						var wrong_answer2 = Amarok.Collection.query(sql_genre.replace("#",random_number(1,Amarok.Collection.totalGenres())));
						var wrong_answer3 = Amarok.Collection.query(sql_genre.replace("#",random_number(1,Amarok.Collection.totalGenres())));
						break;
				}

				break;

			case 1:
				tracks = Amarok.Playlist.totalTrackCount();
				do
					track_number = random_number(0,tracks);
				while(track_number == previous_track_number);
				Amarok.Playlist.playByIndex(track_number);


				switch (question){
					case 1:
						dialog.question.text = q1;				
						correct_answer = Amarok.Engine.currentTrack().title;

						do
							var wrong_answer1 = Amarok.Playlist.trackAt(random_number(0,tracks)).title;
						while (correct_answer == wrong_answer1);

						do
							var wrong_answer2 = Amarok.Playlist.trackAt(random_number(0,tracks)).title;
						while (correct_answer == wrong_answer2);

						do
							var wrong_answer3 = Amarok.Playlist.trackAt(random_number(0,tracks)).title;
						while (correct_answer == wrong_answer3);
						break;

					case 2:
						dialog.question.text = q2;
						correct_answer = Amarok.Engine.currentTrack().artist;

						var wrong_answer1 = Amarok.Playlist.trackAt(random_number(0,tracks)).artist;
						var wrong_answer2 = Amarok.Playlist.trackAt(random_number(0,tracks)).artist;
						var wrong_answer3 = Amarok.Playlist.trackAt(random_number(0,tracks)).artist;
						break;
						
					case 3:
						dialog.question.text = q3;				
						correct_answer = Amarok.Engine.currentTrack().album;

						var wrong_answer1 = Amarok.Playlist.trackAt(random_number(0,tracks)).album;
						var wrong_answer2 = Amarok.Playlist.trackAt(random_number(0,tracks)).album;
						var wrong_answer3 = Amarok.Playlist.trackAt(random_number(0,tracks)).album;
						break;
				
					case 4:
						dialog.question.text = q4;
						correct_answer = Amarok.Engine.currentTrack().year;

						var wrong_answer1 = Amarok.Playlist.trackAt(random_number(0,tracks)).year;
						var wrong_answer2 = Amarok.Playlist.trackAt(random_number(0,tracks)).year;
						var wrong_answer3 = Amarok.Playlist.trackAt(random_number(0,tracks)).year;
						break;
				
					case 5:
						dialog.question.text = q5;
						correct_answer = Amarok.Engine.currentTrack().genre;

						var wrong_answer1 = Amarok.Playlist.trackAt(random_number(0,tracks)).genre;
						var wrong_answer2 = Amarok.Playlist.trackAt(random_number(0,tracks)).genre;
						var wrong_answer3 = Amarok.Playlist.trackAt(random_number(0,tracks)).genre;
						break;
				}

				break;

			case 2:
				var selected_artist = dialog.group_places.artists.currentText;
				var id_artist = Amarok.Collection.query("SELECT `id` FROM `artists` WHERE `name`='#'".replace("#",selected_artist));
				var id_tracks = (Amarok.Collection.query("SELECT `id` FROM `tracks` WHERE `artist`=#".replace("#",id_artist))+"").split(",");
				

				tracks = id_tracks.length;
				do
					track_number = id_tracks[random_number(0,tracks)];
				while(track_number == previous_track_number);


				var url = Amarok.Collection.query("SELECT `rpath` FROM `urls` WHERE `id`=#".replace("#",track_number))+"";

				Amarok.Playlist.playMedia(new QUrl(url));
				Amarok.Playlist.removeCurrentTrack();


				switch (question){
					case 1:
						dialog.question.text = q1;				
						correct_answer = Amarok.Engine.currentTrack().title;
						var sql_title = "SELECT `title` FROM `tracks` WHERE `id`=#";

						do
							var wrong_answer1 = Amarok.Collection.query(sql_title.replace("#",id_tracks[random_number(0,tracks)]));
						while (correct_answer == wrong_answer1);

						do
							var wrong_answer2 = Amarok.Collection.query(sql_title.replace("#",id_tracks[random_number(0,tracks)]));
						while (correct_answer == wrong_answer2);

						do
							var wrong_answer3 = Amarok.Collection.query(sql_title.replace("#",id_tracks[random_number(0,tracks)]));
						while (correct_answer == wrong_answer3);
						break;

					case 3:
						dialog.question.text = q3;				
						correct_answer = Amarok.Engine.currentTrack().album;
						var id_albums = (Amarok.Collection.query("SELECT `id` FROM `albums` WHERE `artist`=#".replace("#",id_artist))+"").split(",");
						var albums = id_albums.length;
						var sql_album = "SELECT `name` FROM `albums` WHERE `id`=#";
					
						var wrong_answer1 = Amarok.Collection.query(sql_album.replace("#",id_albums[random_number(0,albums)]));
						var wrong_answer2 = Amarok.Collection.query(sql_album.replace("#",id_albums[random_number(0,albums)]));
						var wrong_answer3 = Amarok.Collection.query(sql_album.replace("#",id_albums[random_number(0,albums)]));
						break;
				
					case 4:
						dialog.question.text = q4;
						correct_answer = Amarok.Engine.currentTrack().year;
						var years = (Amarok.Collection.query("SELECT `name` FROM `years`")+"").split(",");
			
						var wrong_answer1 = years[random_number(0,years.length)];
						var wrong_answer2 = years[random_number(0,years.length)];
						var wrong_answer3 = years[random_number(0,years.length)];
						break;

					case 5:
						dialog.question.text = q5;
						correct_answer = Amarok.Engine.currentTrack().genre;
						var sql_genre = "SELECT `name` FROM `genres` WHERE `id`=#";

						var wrong_answer1 = Amarok.Collection.query(sql_genre.replace("#",random_number(1,Amarok.Collection.totalGenres())));
						var wrong_answer2 = Amarok.Collection.query(sql_genre.replace("#",random_number(1,Amarok.Collection.totalGenres())));
						var wrong_answer3 = Amarok.Collection.query(sql_genre.replace("#",random_number(1,Amarok.Collection.totalGenres())));
						break;
				}

				break;

		}

		correct_option = random_number(1,4);

		if (correct_option == 1){
		dialog.group_options.option1.text = correct_answer;
		dialog.group_options.option2.text = wrong_answer1;
		dialog.group_options.option3.text = wrong_answer2;
		dialog.group_options.option4.text = wrong_answer3;
		}

		if (correct_option == 2){
		dialog.group_options.option1.text = wrong_answer1;
		dialog.group_options.option2.text = correct_answer;
		dialog.group_options.option3.text = wrong_answer2;
		dialog.group_options.option4.text = wrong_answer3;
		}

		if (correct_option == 3){
		dialog.group_options.option1.text = wrong_answer1;
		dialog.group_options.option2.text = wrong_answer2;
		dialog.group_options.option3.text = correct_answer;
		dialog.group_options.option4.text = wrong_answer3;
		}

		if (correct_option == 4){
		dialog.group_options.option1.text = wrong_answer1;
		dialog.group_options.option2.text = wrong_answer2;
		dialog.group_options.option3.text = wrong_answer3;
		dialog.group_options.option4.text = correct_answer;
		}		


		timer.start(1000, false);

	}else{
		timer.stop()
		Amarok.Engine.Stop();
		dialog.group_counter.hide();
		dialog.time_bar.hide();
		dialog.mq_icon.show();
		dialog.start.text = string_play_again;
		dialog.start.show();
		dialog.personalize.show();
		if(correct_answers == number_questions){
			dialog.question.text = string_perfect;
			dialog.label2.text = string_all;
		}else{
			dialog.question.text = string_finish;
			dialog.label2.text = correct_answers+string_correct_answers.replace("##",number_questions);
		}
	}
}


function optionClicked(i){
	timer.stop();
	dialog.time_bar.value = 20;
	dialog.group_options.hide();
	songs += 1;
	dialog.group_counter.songs.text = songs;

	if(i == 1){
		dialog.question.text = string_correct;
		correct_answers += 1;
		dialog.group_counter.correct_answers.text = correct_answers;		
	}else{
		dialog.question.text = string_wrong;
		dialog.label2.text = correct_answer;
	}
	timer2.start(2000,true);
}


Amarok.Window.addToolsMenu("startQuiz", "Music Quiz");
Amarok.Window.ToolsMenu.startQuiz["triggered()"].connect(showDialog);
