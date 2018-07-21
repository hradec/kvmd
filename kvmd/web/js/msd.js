var msd = new function() {
	var __state = null;
	var __upload_http = null;
	var __image_file = null;

	this.loadInitialState = function() {
		var http = tools.makeRequest("GET", "/kvmd/msd", function() {
			if (http.readyState === 4) {
				if (http.status === 200) {
					msd.setState(JSON.parse(http.responseText).result);
				} else {
					setTimeout(msd.loadInitialState, 1000);
				}
			}
		});
	};

	this.setState = function(state) {
		__state = state;
		__applyState();
	};

	this.clickButton = function(el_button) {
		if (el_button.id === "msd-upload-new-image-button") {
			var form_data = new FormData();
			form_data.append("image_name", __image_file.name);
			form_data.append("image_data", __image_file);

			__upload_http = new XMLHttpRequest();
			__upload_http.open("POST", "/kvmd/msd/write", true);
			__upload_http.upload.timeout = 5000;
			__upload_http.onreadystatechange = __uploadStateChange;
			__upload_http.upload.onprogress = __uploadProgress;
			__upload_http.send(form_data);

		} else if (el_button.id === "msd-abort-uploading-button") {
			__upload_http.onreadystatechange = null;
			__upload_http.upload.onprogress = null;
			__upload_http.abort();
			__upload_http = null;
			$("msd-progress").setAttribute("data-label", "Aborted");
			$("msd-progress-value").style.width = "0%";

		} else if (el_button.id === "msd-switch-to-kvm-button" || el_button.id === "msd-switch-to-server-button") {
			var to = (el_button.id === "msd-switch-to-kvm-button" ? "kvm" : "server");
			var http = tools.makeRequest("POST", "/kvmd/msd/connect?to=" + to, function() {
				if (http.readyState === 4) {
					if (http.status !== 200) {
						alert("Switch error:", http.responseText);
					}
				}
				__applyState();
			});
			__applyState();
			el_button.disabled = true;
		}
	};

	this.selectNewImageFile = function(el_input) {
		var image_file = (el_input.files.length ? el_input.files[0] : null);
		if (image_file && image_file.size > __state.info.size) {
			alert("New image is too big for your Mass Storage Device; maximum: " + __formatSize(__state.info.size));
			el_input.value = "";
			image_file = null;
		}
		__image_file = image_file;
		$("msd-new-image").style.display = (__image_file ? "block" : "none");
		$("msd-progress").setAttribute("data-label", "Waiting for upload ...");
		$("msd-progress-value").style.width = "0%";
		$("msd-new-image-name").innerHTML = (__image_file ? __image_file.name : "");
		$("msd-new-image-size").innerHTML = (__image_file ? __formatSize(__image_file.size) : "");
		__applyState();
	};

	var __applyState = function() {
		if (__state.connected_to === "server") {
			$("msd-another-another-user-uploads").style.display = "none";
			$("msd-led").className = "led-on";
			$("msd-status").innerHTML = "Connected to Server";
			$("msd-another-another-user-uploads").style.display = "none";
		} else if (__state.busy) {
			if (!__upload_http) {
				$("msd-another-another-user-uploads").style.display = "block";
			}
			$("msd-led").className = "led-msd-writing";
			$("msd-status").innerHTML = "Uploading new image";
		} else {
			$("msd-another-another-user-uploads").style.display = "none";
			$("msd-led").className = "led-off";
			if (__state.in_operate) {
				$("msd-status").innerHTML = "Connected to KVM";
			} else {
				$("msd-status").innerHTML = "Unavailable";
			}
		}

		$("msd-not-in-operate").style.display = (__state.in_operate ? "none" : "block");
		$("msd-current-image-broken").style.display = (
			__state.in_operate && __state.info.image &&
			!__state.info.image.complete && !__state.busy ? "block" : "none"
		);

		$("msd-current-image-name").innerHTML = (__state.in_operate && __state.info.image ? __state.info.image.name : "None");
		$("msd-current-image-size").innerHTML = (__state.in_operate && __state.info.image ? __formatSize(__state.info.image.size) : "None");
		$("msd-storage-size").innerHTML = (__state.in_operate ? __formatSize(__state.info.size) : "Unavailable");

		$("msd-switch-to-kvm-button").disabled = (!__state.in_operate || __state.connected_to === "kvm" || __state.busy);
		$("msd-switch-to-server-button").disabled = (!__state.in_operate || __state.connected_to === "server" || __state.busy);
		$("msd-select-new-image-button").disabled = (!__state.in_operate || __state.connected_to !== "kvm" || __state.busy || __upload_http);
		$("msd-upload-new-image-button").disabled = (!__state.in_operate || __state.connected_to !== "kvm" || __state.busy || !__image_file);
		$("msd-abort-uploading-button").disabled = (!__state.in_operate || !__upload_http);
	};

	var __formatSize = function(size) {
		if (size > 0) {
			var index = Math.floor( Math.log(size) / Math.log(1024) );
			return (size / Math.pow(1024, index)).toFixed(2) * 1 + " " + ["B", "kB", "MB", "GB", "TB"][index];
		} else {
			return 0;
		}
	};

	var __uploadStateChange = function(event) {
		if (__upload_http.readyState === 4) {
			if (__upload_http.status !== 200) {
				alert("Can't upload image to the Mass Storage Device:", __upload_http.responseText);
			} else {
				$("msd-progress").setAttribute("data-label", "Done");
				$("msd-progress-value").style.width = "100%";
			}
			__upload_http = null;
			__applyState();
		}
	};

	var __uploadProgress = function(event) {
		if(event.lengthComputable) {
			var percent = Math.round((event.loaded * 100) / event.total);
			$("msd-progress").setAttribute("data-label", percent + "%");
			$("msd-progress-value").style.width = percent + "%";
		}
	};
};
