import csv
import os
import shutil
import sys
import json
import argparse

#load the data file provided by the authors and extract the computational image statistics and excluded image

STATS_HEADERS = ["website", "black", "silver", "gray", 
"white", "maroon", "red", "purple", "fuchsia", "green", "lime", "olive",
"yellow", "navy", "blue", "teal", "aqua", "hue", "saturation", "value",
"textArea", "nonTextArea", "numOfLeaves", "percentageOfLeafArea", "numOfTextGroup",
"numOfImageArea", "colorfulness1", "colorfulness2","complexitymodel","colorfulnessmodelnew",
"colorfulnessmodel", "colorfulnessmodelnewest", "colorHorizontalSymmetry", "colorVerticalSymmetry",
"intensityHorizontalSymmetry", "intensityVerticalSymmetry", "intensityHorizontalBalance", "intensityVerticalBalance", 
"numOfQuadTreeLeaves_color", "numOfQuadTreeLeaves_intensity", "colorEquilibrium", "intensityEquilibrium"]

PROVIDED_CSV = "./original_data/all.csv"

STIMULI_ROOT_DIR = "./mturk_experiment/website_stimuli/"

def write_csv(data, out_filepath):
    """utils function to write data to CSV file"""
    with open(out_filepath, 'wb') as csvfile:
       writer = csv.writer(csvfile, delimiter=',')
       for row in data:
            writer.writerow(row)
       print "done writing " +out_filepath

def write_json_for_excluded_images(excluded_images_list, out_json_path):
    """writes json data with excluded images info for our mturk interface
    keys are image types and values are image nums to exclude """
    exclude_images = [(x[3], x[2]) for x in excluded_images_list] #get tuples (image type, image num)
    json_data = {}
    for (image_type, image_num) in exclude_images:
        if image_type != "practice" and image_type != "grayscale":
            if image_type not in json_data.keys():
                json_data[image_type] = [image_num]
            else:
                json_data[image_type].append(image_num)
    with open(out_json_path, 'w') as outfile:
        json.dump(json_data, outfile, indent=4)
    return json_data


def load_and_select_csv_data(in_csv):
    """takes the author provided data set and creates a new 2-d array:
    - each row is a webs"./original_data/all.csv"ite
    - each column is a different image stat
    """
    with open(in_csv, 'rb') as csvfile:
        reader = csv.reader(csvfile, delimiter=',')
        headers = next(reader, None) #get the author-provided headers

        #get subset of headers we care about (ignore their user data)
        header_indices = [headers.index(x) for x in STATS_HEADERS] 
        out_data = [STATS_HEADERS]
        seen_websites = []
        for row in reader:
            website = row[1]
            if website not in seen_websites:
                out_data.append([row[x] for x in header_indices])
                seen_websites.append(website)
        return out_data

def find_excluded_websites(subset_csv):
    """figures out which images the authors originally excluded in their analysis
    and returns an array of the excluded image paths"""
    with open(subset_csv, 'rb') as csvfile:
        reader = csv.reader(csvfile, delimiter=',')
        headers = next(reader, None)
        seen_websites = []
        for row in reader:
            website = row[0]
            seen_websites.append(website+".png")
    
    exclude_images = []
    for dirName, subdirList, fileList in os.walk(STIMULI_ROOT_DIR):
        print('Found directory: %s' % dirName)
        for fname in fileList:
            print('\t%s' % fname)
            image_type = dirName.split(os.sep)[-1]
            image_name_orig = image_type+"_"+fname
            image_path = os.path.join(STIMULI_ROOT_DIR, image_type, fname)
            image_num = fname.split('.png')[0]
            if image_name_orig not in seen_websites and ".png" in image_name_orig:
                exclude_images.append([image_name_orig, image_path, image_num, image_type])
    return exclude_images

if __name__ == "__main__": 
    #step 1 get the image stats from the original data:
    selected_data = load_and_select_csv_data(PROVIDED_CSV)
    write_csv(selected_data, "./replication_data/subset.csv")
    #step 2 identify which images were excluded in the original analysis:
    excluded_image_data = find_excluded_websites("./replication_data/subset.csv")
    write_csv(excluded_image_data, "./replication_data/excluded_images.csv")
    excluded_json = write_json_for_excluded_images(excluded_image_data, "./mturk_experiment/excluded_images.json")
    with open("./mturk_experiment/excludedImages.js", 'w') as file:
        file.write("var excludedImages = "+str(excluded_json))

