<?php

use Illuminate\Http\Response;


$router->get('/', function(\Illuminate\Http\Request $request){

    $outcome = array();
    $outcome{"input"} = null;

    if ( $request->has('input') ) {
        // Processing input
        $inputfile = $request->input('input');
        $inputdir = env('QCLOUD_INPUT_PATH');
        
        $outcome{"input"} = $inputfile;

        if ( file_exists( $inputdir."/".$inputfile ) ) {
                        
            if ( $request->has('alt') ) {
                
                // Handling alt
                $outcome{"alt"} = true;
                
                $outputfile = str_replace( ".wiff", "", $inputfile );
                
                $altfile = $outputfile.".wiff.scan";
                
                
                if ( ! file_exists( $inputdir."/".$altfile ) ) {
                    
                    $outcome{"return"} = 400;
                    $outcome{"output"} = null;
                    
                } else {
                    
                    $command =  env('QCLOUD_EXEC_ALT_PATH')." --in ".$inputdir."/".$inputfile." --out ".env('QCLOUD_OUTPUT_PATH')."/".$outputfile.".mzML";

                }
                
            } else {
            
                $outputfile = str_replace( ".raw", "", $inputfile );

                $opts = '--32 --mzML --zlib --filter "peakPicking true 1-"';
                
                if ( $request->has('opts') ) {
                    $opts = $request->input('opts');
                }
                
                $outcome{"opts"} = $opts;
                
                $command =  env('QCLOUD_EXEC_PATH')." ".$inputdir."/".$inputfile." ".$opts." --outfile ".$outputfile." -o ".env('QCLOUD_OUTPUT_PATH');
                
            }
            
            
            $descriptorspec = array(
               0 => array("pipe", "r"),  // stdin is a pipe that the child will read from
               1 => array("pipe", "w"),  // stdout is a pipe that the child will write to
               2 => array("file", env('QCLOUD_ERROR_FILEPATH'), "a") // stderr is a file to write to
            );
            
            $process = proc_open( $command, $descriptorspec, $pipes );
            $return = proc_close($process);
            
            // Check outputfile
            isOutputFileOK( $outputfile );
            
            $outcome{"return"} = $return;
            $outcome{"output"} = $outputfile.".mzML";
                    
        } else {
            
            $outcome{"return"} = 400;
            $outcome{"output"} = null;
        
        }
        
        
    } else {

        $outcome{"return"} = -1;
        $outcome{"output"} = null;

    }
    
    return response()->json( $outcome );

});

/** Checking output file if it has any error */
/* @output String
 * return boolean
*/

function isOutputFileOK( $output ) {
    
    return true;
}


