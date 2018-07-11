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
            
            # Input now is a zip file, which must be handled
        
            if ( is_resource( $zip = zip_open( $inputdir."/".$inputfile ) ) && filesize( $inputdir."/".$inputfile ) > 0 ){
            
                $zip = new ZipArchive;
                $res = $zip->open( $inputdir."/".$inputfile );
                
                if ( $res === TRUE ) {
                    
                    $zip->extractTo( $inputdir );
                    $zip->close();

            
                    if ( $request->has('alt') ) {
                        
                        // Handling alt
                        $outcome{"alt"} = true;
                        
                        # Here we assume archive is kkk.zip and has kkk.wiff and kkk.wiff.scan
                        $proginputfile = str_replace( ".zip", ".wiff", $inputfile );
                        
                        $outputfile = str_replace( ".wiff", "", $proginputfile );
                        
                        $altfile = $outputfile.".wiff.scan";
                        
                        
                        if ( ! file_exists( $inputdir."/".$altfile ) ) {
                            
                            $outcome{"return"} = 400;
                            $outcome{"output"} = null;
                            
                        } else {
                            
                            $command =  env('QCLOUD_EXEC_ALT_PATH')." --in ".$inputdir."/".$proginputfile." --out ".env('QCLOUD_OUTPUT_PATH')."/".$outputfile.".mzML";
        
                        }
                        
                    } else {
                    
                        # Here we assume archive is kkk.zip and has kkk.raw
                        $proginputfile = str_replace( ".zip", ".raw", $inputfile );
                        
                        $outputfile = str_replace( ".raw", "", $proginputfile );
        
                        $opts = '--32 --mzML --zlib --filter "peakPicking true 1-"';
                        
                        if ( $request->has('opts') ) {
                            $opts = $request->input('opts');
                        }
                        
                        $outcome{"opts"} = $opts;
                        
                        $command =  env('QCLOUD_EXEC_PATH')." ".$inputdir."/".$proginputfile." ".$opts." --outfile ".$outputfile." -o ".env('QCLOUD_OUTPUT_PATH');
                        
                    }
                    
                    
                    $descriptorspec = array(
                       0 => array("pipe", "r"),  // stdin is a pipe that the child will read from
                       1 => array("pipe", "w"),  // stdout is a pipe that the child will write to
                       2 => array("file", env('QCLOUD_ERROR_FILEPATH'), "a") // stderr is a file to write to
                    );
                    
                    $process = proc_open( $command, $descriptorspec, $pipes );
                    $return = proc_close($process);
                    
                    // Check outputfile
                    $return = isOutputFileOK( $outputfile, env('QCLOUD_OUTPUT_PATH') );
                    
                    if ( $return === 0 ) {
                    
                        $return = compressAndClean( $outputfile, env('QCLOUD_OUTPUT_PATH'), $inputdir."/".$inputfile );
                    
                    }
                    
                    $outcome{"return"} = $return;
                    $outcome{"output"} = $outputfile.".mzML.zip";
                
                } else {
                    
                    $outcome{"return"} = -4;
                    $outcome{"output"} = null;                 
                }
                
            } else {
                
                $outcome{"return"} = -1;
                $outcome{"output"} = null;               
            }
            
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

function isOutputFileOK( $outputFile, $outputDir ) {
    
    $filename = $outputDir."/".$outputFile.".mzML";

    if ( file_exists( $filename ) && filesize( $filename ) > 0 ) {
        
        return 0;

    } else {
        return -2;
    }
    
}

function compressAndClean( $outputFile, $outputDir, $inputFile ) {
    
    $zip = new ZipArchive();
    $filename = $outputDir."/".$outputFile.".mzML.zip";
    
    if ( $zip->open($filename, ZipArchive::CREATE) !== TRUE ) {

        return -3;
    }
    
    $zip->addFile( $outputDir."/".$outputFile.".mzML", $outputFile.".mzML" );
    $zip->close();
    
    // TODO: rm files
    
    return 0;
}


