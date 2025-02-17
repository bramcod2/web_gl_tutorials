//
// Initialize a shader program
//
function initShaderProgram(gl, vsSource, fsSource) {
	const vertexShader =  loadShader(gl, gl.VERTEX_SHADER, vsSource);
	const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

	// Create the shader program

	const shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	// If creating the shader program failed, alert
	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
		return null;
	}

	return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and compiles it
//
function loadShader(gl, type, source) {
	const shader = gl.createShader(type);

	// Send the source to the shader object
	gl.shaderSource(shader, source);

	// Compile the shader program
	gl.compileShader(shader);

	// See if it compiled successfully
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert('An error occured compiling the shaders: ' + gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}

	return shader;
}

//
// Initialize a texture and load an image.
// When the image finished loading copy it into the texture.
//
function loadTexture(gl, url) {
	const texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);

	// Because images have to be downloaded over the internet
	// they might take a moment until they are ready.
	// Until then, put a single pixel in the texture so we can
	// use it immediately. When the image has finished downloading
	// we'll update the texture with the contents of the image.
	const level = 0;
	const internalFormat = gl.RGBA;
	const width = 1;
	const height = 1;
	const border = 0;
	const srcFormat = gl.RGBA;
	const srcType = gl.UNSIGNED_BYTE;
	const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue
	gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
		width, height, border, srcFormat, srcType, pixel);

	const image = new Image();
	image.crossOrigin = "anonymous";
	image.onload = function() {
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
			srcFormat, srcType, image);

		// WebGL1 has different requirements for power of 2 images
		// vs non power of 2 images so check if the image is a 
		// power of 2 in both dimension.
		if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
			// yes, it's a poweer of 2. 
			gl.generateMipmap(gl.TEXTURE_2D);
		} else {
			// No, it's not a power of 2. Turn off mips and set
			// wrapping to clamp to edge
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		}
	};
	image.src = url;

	return texture;
}

function isPowerOf2(value) {
	return (value & (value - 1)) == 0;
}

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

	// Vertex shader program
	const vsSource = `
	attribute vec4 aVertexPosition;
	attribute vec2 aTextureCoord;
	attribute vec3 aVertexNormal;

	uniform mat4 uModelViewMatrix;
	uniform mat4 uProjectionMatrix;
	uniform mat4 uNormalMatrix;

	varying highp vec2 vTextureCoord;
	varying highp vec3 vLighting;

	void main(){
		gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
		vTextureCoord = aTextureCoord;

		// Apply Lighting effect
		highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
		highp vec3 directionalLightColor = vec3(1, 1, 1);
		highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));

		highp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);

		highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
		vLighting = ambientLight + (directionalLightColor * directional);
	}
	`;
	// Fragment shader program
	const fsSource = `
		varying highp vec2 vTextureCoord;
		varying highp vec3 vLighting;

		uniform sampler2D uSampler;

		void main(void) {
			highp vec4 texelColor = texture2D(uSampler, vTextureCoord);

			gl_FragColor = vec4(texelColor.rgb * vLighting, texelColor.a);
		}
	`;

	const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

	const programInfo = {
		program: shaderProgram,
		attribLocations: {
			vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
			vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
			textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
		},
		uniformLocations: {
			projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
			modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
			normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
			uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
		},	
	};

	// Here's where we call the routine that builds all the 
	// objects we'll be drawing.
	const buffers = initBuffers(gl);

	// Load texture
	const texture = loadTexture(gl, 'cubetexture.png');

	// Draw the scene
	var then = 0;
	function render(now) {
		now *= 0.001; // convert to seconds
		const deltaTime = now - then;
		then = now;

		drawScene(gl, programInfo, buffers, texture, deltaTime);
		requestAnimationFrame(render);
	}
	requestAnimationFrame(render);
}


function initBuffers(gl) {
	// Create a buffer for the square's positions.
	const positionBuffer = gl.createBuffer();

	// Select the positionBuffer as the one to apply buffer operations to from here out.
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

	// Now create an array of positions for the square.

	const positions = [
		// Front face
		-1.0, -1.0, 1.0,
		 1.0, -1.0, 1.0,
		 1.0,  1.0, 1.0,
		-1.0,  1.0, 1.0,

		// Back face
		-1.0, -1.0, -1.0,
		-1.0,  1.0, -1.0,
		 1.0,  1.0, -1.0,
		 1.0, -1.0, -1.0,

		// Top face
		-1.0, 1.0, -1.0,
		-1.0, 1.0,  1.0,
		 1.0, 1.0,  1.0,
		 1.0, 1.0, -1.0,

		// Bottom face
		-1.0, -1.0, -1.0,
		 1.0, -1.0, -1.0,
		 1.0, -1.0,  1.0,
		-1.0, -1.0,  1.0,

		// Right face
		1.0, -1.0, -1.0,
		1.0,  1.0, -1.0,
		1.0,  1.0,  1.0,
		1.0, -1.0,  1.0,

		// Left face
		-1.0, -1.0, -1.0,
		-1.0, -1.0,  1.0,
		-1.0,  1.0,  1.0,
		-1.0,  1.0, -1.0,
	];

	// Now pas the list of positions into WebGL to build the
	// shape. We do this by creating a Float32Array from the
	// JavaScript array, then use it to fill the current buffer.
	gl.bufferData(gl.ARRAY_BUFFER,
		new Float32Array(positions),
		gl.STATIC_DRAW);

	// TEXTURE
	const textureCoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);

	const textureCoordinates = [
	    // Front
	    0.0,  0.0,
	    1.0,  0.0,
	    1.0,  1.0,
	    0.0,  1.0,
	    // Back
	    0.0,  0.0,
	    1.0,  0.0,
	    1.0,  1.0,
	    0.0,  1.0,
	    // Top
	    0.0,  0.0,
	    1.0,  0.0,
	    1.0,  1.0,
	    0.0,  1.0,
	    // Bottom
	    0.0,  0.0,
	    1.0,  0.0,
	    1.0,  1.0,
	    0.0,  1.0,
	    // Right
	    0.0,  0.0,
	    1.0,  0.0,
	    1.0,  1.0,
	    0.0,  1.0,
	    // Left
	    0.0,  0.0,
	    1.0,  0.0,
	    1.0,  1.0,
	    0.0,  1.0,
	];

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);


	const indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

	// This array defines each face as two triangles, using the
	// indices into the vertex array to specify each triangle's 
	// position
	const indices = [
		0,  1,  2,		0,  2,  3,	// front
		4,  5,  6,		4,  6,  7,	// back
		8,  9,  10,		8,  10, 11,	// top
		12, 13, 14,		12, 14, 15, // bottom
		16, 17, 18,		16, 18, 19,	// right
		20, 21, 22,		20, 22, 23, // left
	];

	// send the element array to GL
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
		new Uint16Array(indices), gl.STATIC_DRAW);

	// Normals
	const normalBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);

	const vertexNormals = [
		// Front
	     0.0,  0.0,  1.0,
	     0.0,  0.0,  1.0,
	     0.0,  0.0,  1.0,
	     0.0,  0.0,  1.0,

	    // Back
	     0.0,  0.0, -1.0,
	     0.0,  0.0, -1.0,
	     0.0,  0.0, -1.0,
	     0.0,  0.0, -1.0,

	    // Top
	     0.0,  1.0,  0.0,
	     0.0,  1.0,  0.0,
	     0.0,  1.0,  0.0,
	     0.0,  1.0,  0.0,

	    // Bottom
	     0.0, -1.0,  0.0,
	     0.0, -1.0,  0.0,
	     0.0, -1.0,  0.0,
	     0.0, -1.0,  0.0,

	    // Right
	     1.0,  0.0,  0.0,
	     1.0,  0.0,  0.0,
	     1.0,  0.0,  0.0,
	     1.0,  0.0,  0.0,

	    // Left
	    -1.0,  0.0,  0.0,
	    -1.0,  0.0,  0.0,
	    -1.0,  0.0,  0.0,
	    -1.0,  0.0,  0.0
	];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormals), 
		gl.STATIC_DRAW);
	
	return {
		position: positionBuffer,
		normal: normalBuffer,
		// color: colorBuffer,
		textureCoord: textureCoordBuffer,
		indices: indexBuffer,
	};
}

function drawScene(gl, programInfo, buffers, texture, deltaTime) {
	gl.clearColor(0.0, 0.0, 0.0, 1.0); 	// Clear to black, fully opaque
	gl.clearDepth(1.0);					// Clear everything
	gl.enable(gl.DEPTH_TEST);			// Enable depth testing
	gl.depthFunc(gl.LEQUAL);			// Near things obscure far things

	// Clear the canvas before we start drawing on it
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Create a perspective matrix, a special matrix that is
	// used to simulate the distortion of perspective in a camera.
	// Our field of view is 45 degrees, with a width/height
	// ration that matches the display size of the canvas
	// and we only want to see objects between 0.1 units
	// and 100 units away from the camera.

	const fieldOfView = 45 * Math.PI / 180; // In radians
	const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
	const zNear = 0.1;
	const zFar = 100.0;
	const projectionMatrix = mat4.create();

	// note: glmatrix.js always has the first argument
	// as the destination to receive the result.
	mat4.perspective(projectionMatrix,
		fieldOfView,
		aspect,
		zNear,
		zFar);

	// Set the drawing position to the "identity" point, which is 
	// the center of the scene.
	const modelViewMatrix = mat4.create();

	// Now move the drawing position a bit to where we want to 
	// start drawing the square.
	mat4.translate(modelViewMatrix, 	// destination matrix
		modelViewMatrix,				// matrix to translate
		[-0.0, 0.0, -6.0]);
	// Rotate the cube
	mat4.rotate(modelViewMatrix, 	// destination matrix
		modelViewMatrix, 			// Matrix to rotate
		cubeRotation * .3,				// amount to rotate in radians
		[0, 1, 0]);					// axis to rotate around (y)
	mat4.rotate(modelViewMatrix,	// destination matrix
		modelViewMatrix,			// matrix to rotate
		cubeRotation * .3,				// amount to rotate in radians
		[0, 0, 1]);					// axis to rotate around (z)

	const normalMatrix = mat4.create();
	mat4.invert(normalMatrix, modelViewMatrix);
	mat4.transpose(normalMatrix, normalMatrix);

	// Tell WebGL how to pull out the positions from the position
	// buffer into the vertexPosition attribute.
	{
		const numComponents = 3; 	// pull out 3 values per iteration
		const type = gl.FLOAT;		// the data in the buffer is 32bit floats
		const normalize = false;	// don't normalize
		const stride = 0;			// how many bytes to get from on set of values to the next
									// 0 = use type and numComponents above
		const offset = 0;			// how many bytes inside the buffer to start from
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
		gl.vertexAttribPointer(
			programInfo.attribLocations.vertexPosition,
			numComponents,
			type,
			normalize,
			stride,
			offset);
		gl.enableVertexAttribArray(
			programInfo.attribLocations.vertexPosition);
	}
	// Tell webGL how to pull out the texture coordinates from buffer
	{
		const num = 2; // every coordinate composed of 2 values
		const type = gl.FLOAT; // the data in the buffer is 32 bit float
		const normalize = false; // don't normalize
		const stride = 0; // how many bytes to get from one set to the next
		const offset = 0; // how many bytes inside the buffer to start from
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
		gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, num, type, normalize, stride, offset);
		gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
	}	
	{
		// Tell WebGL how to pull out the normals from
		// the normal buffer into the vertexNormal attribute.
		const numComponents = 3;
		const type = gl.FLOAT;
		const normalize = false;
		const stride = 0;
		const offset = 0;
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
		gl.vertexAttribPointer(
			programInfo.attribLocations.vertexNormal,
			numComponents,
			type,
			normalize,
			stride,
			offset);
		gl.enableVertexAttribArray(
			programInfo.attribLocations.vertexNormal);
	}
	{
		// Tell WebGL which indices to use to index the vertices
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
	}
	

	// Tell WebGL to use our program when drawing
	gl.useProgram(programInfo.program);

	// Set the shader uniforms
	gl.uniformMatrix4fv(
		programInfo.uniformLocations.projectionMatrix,
		false,
		projectionMatrix);
	gl.uniformMatrix4fv(
		programInfo.uniformLocations.modelViewMatrix,
		false,
		modelViewMatrix);
	gl.uniformMatrix4fv(
		programInfo.uniformLocations.normalMatrix,
		false,
		normalMatrix);


	// Tell WebGL we want to affect texture unit 0
	gl.activeTexture(gl.TEXTURE0);

	// Bind the texture to texture unit 0
	gl.bindTexture(gl.TEXTURE_2D, texture);

	// Tell the shader we bound the texture to texture unit 0
	gl.uniform1i(programInfo.uniformLocations.uSampler, 0);	

	{
		const offset = 0;
		const vertexCount = 36;
		const type = gl.UNSIGNED_SHORT;
		gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
	}

	// Update the rotation for the next draw
	cubeRotation += deltaTime;
}

var cubeRotation = 0.0;
window.onload = main;