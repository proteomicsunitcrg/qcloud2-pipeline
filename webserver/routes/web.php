<?php

/*
|--------------------------------------------------------------------------
| Application Routes
|--------------------------------------------------------------------------
|
| Here is where you can register all of the routes for an application.
| It is a breeze. Simply tell Lumen the URIs it should respond to
| and give it the Closure to call when that URI is requested.
|
*/

$router->get('/', function(\Illuminate\Http\Request $request){

    if ( $request->has('input') ) {
        // Processing input
        return $request->input('input');
    } else {
        return "Nothing here!";
    }

});

$router->get('/env', function () use ($router) {
    return json_encode( env('APP_TIMEZONE') );
});

