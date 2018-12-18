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
                    
                    $orifile = "";
                    
                    if ( $request->has('orifile') ){
                        $orifile = $request->input('orifile');
                    }
                    
                    $zip->extractTo( $inputdir );
                    $zip->close();
            
                    if ( $request->has('alt') ) {
                        
                        // Handling alt
                        $outcome{"alt"} = true;
                        
                        # Here we assume archive is kkk.zip and has kkk.wiff and kkk.wiff.scan
                        $proginputfile = str_replace( ".zip", ".wiff", $inputfile );
                        
                        if ( $orifile && $orifile != "" ) {
                            $proginputfile = $orifile."_".$proginputfile;
                        }
                        
                        $outputfile = str_replace( ".zip", "", $inputfile );
                        
                        $altfile = $outputfile.".wiff.scan";
                        
                        if ( $orifile && $orifile != "" ) {
                            $altfile = $orifile."_".$altfile;
                        }
                        
                        $opts = '--32 --mzML --zlib --filter "peakPicking true 1-"';
                        
                        if ( $request->has('opts') ) {
                            $opts = $request->input('opts');
                        }
                        
                        $outcome{"opts"} = $opts;
                        
                        if ( $request->has('output') ) {
                            $outputfile = $request->input('output');
                        } else {
                            $outputfile = $outputfile.".mzML";
                        }
                        
                        if ( ! file_exists( $inputdir."/".$altfile ) ) {
                            
                            $outcome{"return"} = 401;
                            $outcome{"output"} = null;
                            
                        } else {
                            
                            $command =  env('QCLOUD_EXEC_PATH')." ".$inputdir."/".$proginputfile." ".$opts." --outfile ".$outputfile." -o ".env('QCLOUD_OUTPUT_PATH');
        
                        }
                        
                    } else {
                    
                        # Here we assume archive is kkk.zip and has kkk.raw
                        $proginputfile = str_replace( ".zip", ".raw", $inputfile );
                        
                        if ( $orifile && $orifile != "" ) {
                            $proginputfile = $orifile."_".$proginputfile;
                        }
                        
                        $outputfile = str_replace( ".zip", "", $inputfile );
        
                        $opts = '--32 --mzML --zlib --filter "peakPicking true 1-"';
                        
                        if ( $request->has('opts') ) {
                            $opts = $request->input('opts');
                        }
                        
                        $outcome{"opts"} = $opts;
                        
                        if ( $request->has('output') ) {
                            $outputfile = $request->input('output');
                        } else {
                            $outputfile = $outputfile.".mzML";
                        }
                        
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
    
    // TODO: more control on unlinks

    // remove mzML uncompressed
    $unlink = unlink( $outputDir."/".$outputFile.".mzML" );
    
    // remove input files
    $inputFile = str_replace( ".zip", "", $inputFile );
    $inremove = glob( $inputFile."*" );
    
    foreach ( $inremove as $inrm ) {
        
        if ( ! endsWithStr( $inrm, ".zip" ) ) {
            
            $unlink = unlink( $inrm );
        }
     
    }
    
    return 0;
}

function endsWithStr( $haystack, $needle ) {
    $length = strlen($needle);

    return $length === 0 || 
    (substr($haystack, -$length) === $needle);
}

