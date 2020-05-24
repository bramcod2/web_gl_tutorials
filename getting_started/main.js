//
// start here
// 
function main(){
	const canvas = document.querySelector("#glCanvas");
	// Initialize the GL context
	const gl = canvas.getContext("webgl");

	// Only continue if WebGL is available and working
	if (gl === null){
		alert("WebGL failed");
		return;
	}

	// set clear color to black, fully opaque
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	// Clear color buffer with specified clear color
	gl.clear(gl.COLOR_BUFFER_BIT);
}

window.onload = main;