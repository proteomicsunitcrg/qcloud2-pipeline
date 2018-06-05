<?php

use Illuminate\Http\Response;


$router->get('/', function(\Illuminate\Http\Request $request){

    if ( $request->has('input') ) {
        // Processing input
        $inputfile = $request->input('input');
        $inputdir = env('QCLOUD_INPUT_PATH');
        
        if ( file_exists( $inputdir."/".$inputfile ) ) {
            
            $outputfile = str_replace( $infile, ".raw", "" );
            # Z:\rolivella\mydata\raw\QC1F\180218_Q_QC1F_01_11.raw --32 --mzML --zlib --filter "peakPicking true 1-" --outfile 180218_Q_QC1F_01_11 -o Z:\rolivella\mydata\mzml
            $command =  env('QCLOUD_EXEC_PATH')." ".$inputdir."/".$inputfile." --32 --mzML --zlib --filter \"peakPicking true 1-\" --outfile ".$outputfile." -o ".env('QCLOUD_OUTPUT_PATH');
            $descriptorspec = array(
               0 => array("pipe", "r"),  // stdin is a pipe that the child will read from
               1 => array("pipe", "w"),  // stdout is a pipe that the child will write to
               2 => array("file", env('QCLOUD_ERROR_FILEPATH'), "a") // stderr is a file to write to
            );
            
            $process = proc_open( $comnand, $descriptorspec, $pipes );
            $return = proc_close($process);
            
            $outcome = array();
            $outcome{"return"} = $return;
            $outcome{"output"} = $outputfile;
            
            return response()->json( $outcome );
        }
        
        
    } else {

        $outcome = array();
        $outcome{"return"} = 0;
        $outcome{"output"} = null;
        
        return response()->json( $outcome );
        
    }

});

