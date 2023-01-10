import logging, configparser, getopt
from subprocess import *
import sys, os, time, json, glob

def jarWrapper(*args):
    process = Popen(['java', '-cp']+list(args), stdout=PIPE, stderr=PIPE)
    ret = []
    while process.poll() is None:
        line = process.stdout.readline().decode()
        line = line.replace('\r\n','\n')
        if line != '' and line.endswith('\n'):
            ret.append(line[:-1])
    stdout, stderr = process.communicate()
    ret += stdout.decode().split('\n')
    if stderr.decode() != '':
        ret += stderr.decode().split('\n')
    ret = list(filter(lambda a: a != '', ret))
    return ret
    
def main(argv):

    if argv[1] == 'all':
        scripts = glob.glob("*.es")
    else:
        scripts = argv[1].split(",")
    
    symbols = argv[2]
    
    for script in scripts:
    

        script_name = script.split('.')[0].upper()

        args = ['ErgoScriptCompiler-assembly-0.1.jar', 'Compile', script, symbols] # Any number of args to be passed to the jar file

        result = jarWrapper(*args)

        if (result[0] == 'ErgoTree:'):

            print ("""
export const %s_SCRIPT="%s";
export const %s_SCRIPT_HASH="%s";
export const %s_SCRIPT_ADDRESS="%s";
""" % (script_name, result[1], script_name, result[3], script_name, result[5]))
        else:
            print("ERROR compiling %s \n" % argv[1])
            print('\n'.join(result))
            

if __name__ == "__main__":
    main(sys.argv)