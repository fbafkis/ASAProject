import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
/// The client instance.
const client = new DeliverooApi(
    'http://localhost:8080',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg1ODhjNjY4MDM4IiwibmFtZSI6ImRvZmIiLCJpYXQiOjE2OTMyMDk5MzZ9.7HAETpezOV1gvytGwTVb6bSP5OKH-90esIYElI_v8hI')

/// Variables and constants.

// Myself (my body).
const me = {};
// The map of the game.
const map = {
    width: undefined,
    height: undefined,
    tiles: new Map(),
    add: function (tile) {
        const { x, y } = tile;
        return this.tiles.set(x + 1000 * y, tile);
    },
    xy: function (x, y) {
        return this.tiles.get(x + 1000 * y)
    }
};
// The field that keeps trace of the parcels currently carried by myself.
me.parcel_count;
// The decading interval of the parcels. 
var parcel_decading_interval;
// The perceiving distance for the parcels. 
var parcel_sensing_distance;
// The maximum number of parcels that I can carry. 
var max_parcels;
// The list of parcels I am currently carrying. 
var delivery_tiles_database = [];
// A counter for patrolling. 
var patrolling_area_counter = 1;
// A flag to ensure that data from the game has correctly retrieved. 
var game_initialized = false;
// Counter to keep trace of the sequential number of patrolling moves pushed.
var patrolling_moves_counter = 0;
// Limit of patrolling moves to execute while I am carrying some parcels before to force the delivery. 
var patrolling_moves_treshold = 5;

var decading_factor;

var long_term_parcel_db = new Map;
var ltpdb_update_interval;
var interval_trigger = true;


/// Functions.

//Function to calculate the distance using coordinates.
function calculate_distance(target_x, target_y, tile_x, tile_y) {
    const dx = Math.abs(Math.round(target_x) - Math.round(tile_x))
    const dy = Math.abs(Math.round(target_y) - Math.round(tile_y))
    return dx + dy;
}

// Retrieving the information about myself. 
client.onYou(({ id, name, x, y, score }) => {
    me.id = id
    me.name = name
    me.x = x
    me.y = y
    me.score = score
})

// Retrieving the game's settings parameters. 
client.onConfig((config) => {
    parcel_decading_interval = config.PARCEL_DECADING_INTERVAL;
    parcel_sensing_distance = config.PARCELS_OBSERVATION_DISTANCE;
    max_parcels = config.PARCELS_MAX;
    // Initializing the long term parcel DB refreshing interval basing on the value of the decading interval. 
    switch (parcel_decading_interval) {
        case '1s': 
            ltpdb_update_interval = 1000;
            decading_factor = 1;
            break;
        case '2s': 
            ltpdb_update_interval = 2000; 
            decading_factor = 0.5;
            break;
        case '5s':
            ltpdb_update_interval = 5000;
            decading_factor = 0.2;
            break;
        case '10s': 
            ltpdb_update_interval = 10000;
            decading_factor = 0.1;
            break;
        default: 
            ltpdb_update_interval = 1000;
            decading_factor = 0;
            break;
    }
    game_initialized = true;
});

// Retrieving the information about the map. 
client.onMap((width, height, tiles) => {
    map.width = width;
    map.height = height;
    for (const t of tiles) {
        map.add(t);
        // Add delivery tiles to delivery tiles DB.
        if (t.delivery) {
            delivery_tiles_database.push(t);
        }
    }
    // Preparing the patrolling strategy. 
    select_patrolling_points();
});

/*
client.onTile((x, y, delivery) => {
    map.add({ x, y, delivery });
}); */

// The parcel DB where all the currently perceived parcels are stored. 

/**
 * @type {Map<string,[{id, x, y, carriedBy, reward}]}
 */
const parcel_db = new Map()

// Data structures for patrolling strategy. 

/**
 * @type {Map<string,[{x_coordinate}]}
 */
const patrolling_x_coordinates = new Map()

/**
 * @type {Map<string,[{y_coordinate}]}
 */
const patrolling_y_coordinates = new Map()

// Function that selects the pivot points on the map to perform patrolling. 

function select_patrolling_points() {

    let target_x;
    let target_y;
    let valid_tile;

    target_y = Math.floor(map.height / 3) + 1;
    target_x = Math.floor(map.width / 3) + 1;

    //TODO: If patrolling is specified - check if tile is undefined

    patrolling_x_coordinates.set("1", target_x);
    patrolling_y_coordinates.set("1", target_y);


    patrolling_x_coordinates.set("2", (target_x));
    patrolling_y_coordinates.set("2", (target_y * 2));

    patrolling_x_coordinates.set("3", (target_x * 2));
    patrolling_y_coordinates.set("3", (target_y * 2));

    patrolling_x_coordinates.set("4", (target_x * 2));
    patrolling_y_coordinates.set("4", (target_y));

    return;
}

// TODO: is it used for somthing? 

function check_patrolling_point(x, y) {
    var valid_tile = false;
    for (const tile of map.tiles.values()) {
        if (tile.x == x && tile.y == y) {
            valid_tile == true;
        }
    }

    return valid_tile;
}

// Function for comparing to intentions and returning the better option
function ordering_IntentionQueue(latest, old) {
    
console.log("Intention Queue:");
myAgent.intention_queue.forEach(intention => {
    console.log(intention.predicate);
});

var new_parcel = parcel_db.get(latest.predicate[3]);  
var old_parcel = parcel_db.get(old.predicate[3]);

console.log(new_parcel);
console.log(old_parcel);

try {
var distance_new_parcel = calculate_distance(new_parcel.x, new_parcel.y, me.x, me.y);
var distance_old_parcel = calculate_distance(old_parcel.x, old_parcel.y, me.x, me.y);

var total_reward_new_parcel = new_parcel.reward - distance_new_parcel;
var total_reward_old_parcel = old_parcel.reward - distance_old_parcel;

console.log("OIQ - The Value of newly perceived parcel " + new_parcel.id + " is: " + total_reward_new_parcel); 
console.log("OIQ - The Value queued perceived parcel " + old_parcel.id + " is: " + total_reward_old_parcel); 

if (total_reward_new_parcel >= (total_reward_old_parcel + 5)) {
    return new_parcel.id;
} else {
    return old_parcel.id;
}
} catch (err) {
console.log("WARNING! EXCEPTION CAUGHT!")
console.log(err);

let exception = "exception"
    return exception;
}
}

// If Exception is caught -> Function is called for making IQ consistent again
function intention_revision_reset(){

    console.log("The Exception gets now processed!");
    console.log("The Agent is carrying " + me.parcel_count + " parcels");
    console.log("The Current Intentions are: ");
    myAgent.intention_queue.forEach(intention => {
        console.log(intention.predicate);
    });

    if (me.parcel_count == 0) {
        // Set IQ Length to 0
        myAgent.intention_queue.length = 0;
        let recovery_patrolling = patrolling_case_selection();
        //Pass patrolling Intention to Agent
        myAgent.push(recovery_patrolling);
    } else if (me.parcel_count > 0) {
        // Set IQ Length to 0
        myAgent.intention_queue.length = 0;

        let recovery_min_del_tile_distance = null;
        let recovery_agent_nearest_delivery_tile;
        delivery_tiles_database.forEach(dt => {
            let distance = calculate_distance(dt.x, dt.y, me.x, me.y);
            if (recovery_min_del_tile_distance == null) {
                recovery_min_del_tile_distance = distance;
                recovery_agent_nearest_delivery_tile = dt;
            } else {
                if (distance < recovery_min_del_tile_distance) {
                    recovery_min_del_tile_distance = distance;
                    recovery_agent_nearest_delivery_tile = dt;
                }
            }
        });

        let recovery_put_down = ['go_put_down', recovery_agent_nearest_delivery_tile.x, recovery_agent_nearest_delivery_tile.y, true];

        //Pass Put Down Intention to Agent
        myAgent.push(recovery_put_down);
    }
 }

// Function that produces the best patrolling option for the current situation. 

function patrolling_case_selection() {
    let idle;

    //Check Quadrant Counter is in bounds
    if (patrolling_area_counter > 4 || patrolling_area_counter < 1) {
        patrolling_area_counter = 1;
    }

    if (patrolling_area_counter == 1) {
        idle = ['patrolling', patrolling_x_coordinates.get("1"), patrolling_y_coordinates.get("1")];
        patrolling_area_counter++;
    } else if (patrolling_area_counter == 2) {
        idle = ['patrolling', patrolling_x_coordinates.get("2"), patrolling_y_coordinates.get("2")];
        patrolling_area_counter++;
    } else if (patrolling_area_counter == 3) {
        idle = ['patrolling', patrolling_x_coordinates.get("3"), patrolling_y_coordinates.get("3")];
        patrolling_area_counter++;
    } else if (patrolling_area_counter == 4) {
        idle = ['patrolling', patrolling_x_coordinates.get("4"), patrolling_y_coordinates.get("4")];
        patrolling_area_counter++;
    }

    return idle;
}

// Function to set the agent going to the (eventually present)best parcel into the long term parcel DB (GTMP). 

function go_to_memorized_parcel() {

    let highest_ratio = null;
    let best_parcel;

    for (const [pid, parcel] of long_term_parcel_db) {

        var direct_min_del_tile_distance = null;
        var parcel_nearest_delivery_tile;
        delivery_tiles_database.forEach(dt => {
            let distance = calculate_distance(dt.x, dt.y, parcel.x, parcel.y);
            if (direct_min_del_tile_distance == null) {
                direct_min_del_tile_distance = distance;
                parcel_nearest_delivery_tile = dt;
            } else {
                if (distance < direct_min_del_tile_distance) {
                    direct_min_del_tile_distance = distance;
                    parcel_nearest_delivery_tile = dt;
                }
            }
        });


        let total_distance = calculate_distance(me.x, me.y, parcel.x, parcel.y) + direct_min_del_tile_distance;
        let parcel_ratio = parcel.reward - Math.round(total_distance * decading_factor); 
        if (highest_ratio == null) {
            highest_ratio = parcel_ratio;
            best_parcel = parcel;
        } else {
            if (parcel_ratio > highest_ratio)
                highest_ratio = parcel_ratio;
                best_parcel = parcel;
        }
    }

    // Check if parcel is worth to be picked up -> If not go normal patrolling

    if (highest_ratio > 0) {
    console.log("GTMP - The best parcel to try to pickup from the long term parcel DB is: ");
    console.log(best_parcel);

    var option = ['patrolling', best_parcel.x, best_parcel.y];
    return option;
    } else {
        var option = patrolling_case_selection();
        patrolling_moves_counter++;
        return option;
    }
}

// Function that selects the best available parcel that is in the long term parcel_db -> returns best option which is used for comparing

function best_option_memorized_parcel(){

    let highest_ratio = null;
    let best_parcel = null;
    let best_parcel_distance = null;
    let return_values = [];

    for (const [pid, parcel] of long_term_parcel_db) {

        var direct_min_del_tile_distance = null;
        var parcel_nearest_delivery_tile;
        delivery_tiles_database.forEach(dt => {
            let distance = calculate_distance(dt.x, dt.y, parcel.x, parcel.y);
            if (direct_min_del_tile_distance == null) {
                direct_min_del_tile_distance = distance;
                parcel_nearest_delivery_tile = dt;
            } else {
                if (distance < direct_min_del_tile_distance) {
                    direct_min_del_tile_distance = distance;
                    parcel_nearest_delivery_tile = dt;
                }
            }
        });


        let distance = calculate_distance(me.x, me.y, parcel.x, parcel.y);

        if (distance > (parcel_sensing_distance + 3)) {
            continue;
        }
        else {
        let total_distance = distance + direct_min_del_tile_distance;
        let parcel_ratio = parcel.reward - Math.round(total_distance * decading_factor); 
        if (highest_ratio == null) {
            highest_ratio = parcel_ratio;
            best_parcel = parcel;
            best_parcel_distance = total_distance;
        } else {
            if (parcel_ratio > highest_ratio)
                highest_ratio = parcel_ratio;
                best_parcel = parcel;
                best_parcel_distance = total_distance;
        }
    }
}
    return_values.push(best_parcel);
    return_values.push(highest_ratio);
    return_values.push(best_parcel_distance);

    return return_values;
}

// Option Choosing Function (OCF). The core function that provides always the best option for the current situation. 

function option_choosing_function() {

    //TODO: Parcel slips out of sensing area (Reward 28), in sensing area only 1 parcel (Reward 10) -> Makes probably sense to go to other parcel of long term memory
    /// Variables declaration.

    var best_option; //The best option that will be returned as result at the end of the function. 
    let valid_parcels = new Map; //The map containing the eventually found valid parcels with the respective reward gains. 

    /// 0.1 Finding the nearest delivery tile respect to the current position of the agent. 

    //console.log("OCF - Delivery tiles DB length:");
    //console.log(delivery_tiles_database.length);

    var direct_min_del_tile_distance = null;
    var agent_nearest_delivery_tile;
    delivery_tiles_database.forEach(dt => {
        let distance = calculate_distance(dt.x, dt.y, me.x, me.y);
        if (direct_min_del_tile_distance == null) {
            direct_min_del_tile_distance = distance;
            agent_nearest_delivery_tile = dt;
        } else {
            if (distance < direct_min_del_tile_distance) {
                direct_min_del_tile_distance = distance;
                agent_nearest_delivery_tile = dt;
            }
        }
    });



    /// 0.2 Calculate the reward/distance ratio for each parcel, finding out the one with the highest. 
    let best_ratio_parcel;
    let best_ratio = null;


    // Check that into the perceived parcels there are not only those I am carrying, otherwise it is useless to search for best ratio parcel.
    if (me.parcel_count < parcel_db.size) {
        for (const [pid, parcel] of parcel_db) {
            if (parcel.carriedBy != me.id) { // Not considering parcels carried by myself. 

                //Check distance from parcel to closest delivery tile

                var parcel_to_del_tile_distance = null;
                var parcel_closest_delivery_tile;
       
                delivery_tiles_database.forEach(dt => {
                     let p_dt_distance = calculate_distance(dt.x, dt.y, parcel.x, parcel.y);
                      if (parcel_to_del_tile_distance == null) {
                      parcel_to_del_tile_distance = p_dt_distance;
                      parcel_closest_delivery_tile = dt;
                     } else {
                         if (p_dt_distance < parcel_to_del_tile_distance) {
                            parcel_to_del_tile_distance = p_dt_distance;
                            parcel_closest_delivery_tile = dt;
                }
            }
        });

        //Calculate which parcel offers the highest ratio

                let distance = calculate_distance(parcel.x, parcel.y, me.x, me.y) + parcel_to_del_tile_distance; 
                let ratio
                if (distance > 0) {
                    ratio = parcel.reward - Math.round(distance * decading_factor);
                } else {
                    ratio = parcel.reward;
                }
                if (best_ratio == null) {
                    best_ratio_parcel = parcel;
                    best_ratio = ratio;
                } else {
                    if (ratio > best_ratio) {
                        best_ratio = ratio;
                        best_ratio_parcel = parcel;
                        }
                }
               
            }
        }
         console.log("OCF - Parcel " + best_ratio_parcel.id + " has the best ratio with the value: " + best_ratio);
    }

    // 0.3 Compare with memorized parcels of long term parcel_db

    var memorized_parcel_option = best_option_memorized_parcel();
    var best_memorized_parcel;

    if (memorized_parcel_option[0] == null || memorized_parcel_option[1] < 0)  {
        best_memorized_parcel = null;
    } else {
        best_memorized_parcel = memorized_parcel_option[0];
        console.log("OCF - Parcel " + best_memorized_parcel.id + " has the best ratio of the long-term parcel_db with the value: " + memorized_parcel_option[1]);
    }

 

    /// Case management.

    /// Case 1: Maximum number of carried parcels reached.

    if (me.parcel_count >= max_parcels) {
        console.log("OCF - Maximum number of carried parcels reached. Let's go to delivery.")
        best_option = ['go_put_down', agent_nearest_delivery_tile.x, agent_nearest_delivery_tile.y, true];
    }

    /// Case 2: No maximum number of carried parcels reached. 

    else {

        /// Case 2.1: There is no degradation. 

        if (parcel_decading_interval == 'infinite') {
            console.log("OCF - No degradation perceived.");
            // Check if among the perceived parcels there aren't only the carried parcels. 
            if (me.parcel_count < parcel_db.size) {
                // Compare best available parcel in the sensing area with best available parcel of the long term parcel_db
                if ((best_memorized_parcel != null) && (memorized_parcel_option[1] >= best_ratio + 10)) {
                // Choose to patroll to best registered parcel from the long-term-memory
                best_option = ['patrolling', best_memorized_parcel.x, best_memorized_parcel.y];
                console.log("OCF - Parcel " + best_memorized_parcel.id + "is set as the patrolling destination");
                } else {
                // Choose to pickup the parcel with the highest reward/distance ratio. 
                best_option = ['go_pick_up', best_ratio_parcel.x, best_ratio_parcel.y, best_ratio_parcel.id];
                console.log("OCF - Parcel " + best_ratio_parcel.id + "is set as the best option");
                }  
            } else if (me.parcel_count == parcel_db.size) {
                // If the perceived parcels are only those that I am carrying, go for patrolling. 
                if (long_term_parcel_db.size == 0) { // If no parcels inside the long term parcel DB
                    best_option = patrolling_case_selection();
                    patrolling_moves_counter++;
                    console.log("OCF - Patrolling moves counter:");
                    console.log(patrolling_moves_counter);
                    console.log("OCF - Patrolling moves treshold:");
                    console.log(patrolling_moves_treshold);
                } else { // If there is at least one parcel inside the long term parcel DB, exploit it. 
                    best_option = go_to_memorized_parcel();
                    console.log("OCF - Exploiting long term parcel DB to optimize patrolling.");
                }
                // If only patrolling options are pushed for a while (when max parcels are almost reached) go to delivery, without losing time going around.  
            }else if (me.parcel_count > 0 && patrolling_moves_counter >= patrolling_moves_treshold) {
                best_option = ['go_put_down', agent_nearest_delivery_tile.x, agent_nearest_delivery_tile.y, true];
                patrolling_moves_counter = 0;
            }
        }

        /// Case 2.2: There is degradation. 

        else {
            console.log("OCF - Degradation perceived.");

            /// Case 2.2.1 If no parcels are currently carried, go to pickup the parcel with the best reward/distnace ratio. 

            
            if (me.parcel_count == 0 && parcel_db.size != 0) {

                if (best_ratio > 0) {

                // Compare best available parcel in the sensing area with best available parcel of the long term parcel_db
                if ((best_memorized_parcel != null) && (memorized_parcel_option[1] >= best_ratio + 10)) {
                // Choose to patroll to best registered parcel from the long-term-memory
                best_option = ['patrolling', best_memorized_parcel.x, best_memorized_parcel.y];
                console.log("OCF - Parcel " + best_memorized_parcel.id + "is set as the patrolling destination");
                } else {
                // Choose to pickup the parcel with the highest reward/distance ratio. 
                best_option = ['go_pick_up', best_ratio_parcel.x, best_ratio_parcel.y, best_ratio_parcel.id];
                console.log("OCF - Parcel " + best_ratio_parcel.id + "is set as the best option");
                }   

            } else {
                if (long_term_parcel_db.size == 0) { // If no parcels inside the long term parcel DB
                    best_option = patrolling_case_selection();
                    patrolling_moves_counter++;
                } else { // If there is at least one parcel inside the long term parcel DB, exploit it. 
                    best_option = go_to_memorized_parcel();
                    console.log("OCF - Exploiting long term parcel DB to optimize patrolling.");
                }
            }

            }

            /// Case 2.2.2 If no parcels are carried and no parcels are perceived, start patrolling.     

            else if (me.parcel_count == 0 && me.parcel_count == parcel_db.size) {
                if (long_term_parcel_db.size == 0) { // If no parcels inside the long term parcel DB
                    best_option = patrolling_case_selection();
                    patrolling_area_counter++;
                    console.log("OCF - Patrolling moves counter:");
                    console.log(patrolling_moves_counter);
                    console.log("OCF - Patrolling moves treshold:");
                    console.log(patrolling_moves_treshold);
                } else { // If there is at least one parcel inside the long term parcel DB, exploit it. 
                    best_option = go_to_memorized_parcel();
                    console.log("OCF - Exploiting long term parcel DB to optimize patrolling.");
                }
            }

            /// Case 2.2.3 If I am carring some parcels and no new parcels are perceived, go for delivery. 

            else if (me.parcel_count != 0 && me.parcel_count == parcel_db.size) {
                best_option = ['go_put_down', agent_nearest_delivery_tile.x, agent_nearest_delivery_tile.y, true];
            }

            /// Case 2.2.4 If some parcels are currently being carried by me and some new parcels are perceived, do the full reasoning. 

            else if (me.parcel_count != 0 && me.parcel_count != parcel_db.size) {

                /// 2.2.4.1 Calculate the estimated final score for each parcel that is carried right 
                /// now in case of direct delivery (no picking up new parcels). 

            
                var my_parcels_db_no_pickup = new Map;

                for (const [key, p] of parcel_db.entries()) {
                    if (p.carriedBy == me.id) {
                        let final_reward = p.reward - Math.round(direct_min_del_tile_distance * decading_factor);
                        if (final_reward < 0)
                            final_reward = 0;
                        my_parcels_db_no_pickup.set(p, final_reward);
                    }
                }

                //console.log("OCF - Parcel DB no pickup size:");
                //console.log(my_parcels_db_no_pickup.size);

                /// 2.2.4.2 Calculate the agent final reward (sum) in case of direct delivery (no picking up new parcels).

                var agent_total_final_reward_no_pickup = 0;

                for (const [parcel, final_reward] of my_parcels_db_no_pickup.entries()) {
                    console.log("OCF - Carried parcels final reward with no pickup:");
                    console.log(final_reward);
                    agent_total_final_reward_no_pickup += final_reward;
                }

                //console.log("OCF - Agent final reward if no pickup:");
                //console.log(agent_total_final_reward_no_pickup);

                /// 2.2.4.3 The loop to estimate for each perceived parcel the final reward in case of picking up 

                for (const [pid, p] of parcel_db.entries()) {

                    ///  2.2.4.3.1 Find and calulate related distance of the nearest delivery tile for the current analyzed parcel. 

                    if (!p.carriedBy) { // make sure that I am not analyzing a parcel that I am currently carrying (the parcels carried by others are not placed into parcel DB).
                        let parcel_min_del_tile_distance = null;
                        var parcel_nearest_delivery_tile;
                        delivery_tiles_database.forEach(dt => {
                            let distance = calculate_distance(dt.x, dt.y, p.x, p.y);
                            if (parcel_min_del_tile_distance == null) {
                                parcel_min_del_tile_distance = distance;
                                parcel_nearest_delivery_tile = dt;
                            } else {
                                if (distance < parcel_min_del_tile_distance)
                                    parcel_min_del_tile_distance = distance;
                                parcel_nearest_delivery_tile = dt;
                            }
                        });

                        /// 2.2.4.3.2 Calculating also the distance between the agent and the currently analyzed parcel. Then the sum of 
                        /// delivery tile - parcel distance and agent - parcel distance is computed to obtain the total distance for the 
                        /// currently analyzed parcel. 

                        let parcel_agent_distance = calculate_distance(p.x, p.y, me.x, me.y);
                        var parcel_total_distance = parcel_min_del_tile_distance + parcel_agent_distance;

                        /// 2.2.2.3.3 Calculate the final score for each parcel currently carried by the agent. 


                        let my_parcels_db_pickup = new Map;

                        for (const [pid, parcel] of parcel_db.entries()) {
                            if (parcel.carriedBy == me.id) {
                                let final_reward = parcel.reward - Math.round(parcel_total_distance * decading_factor);
                                //console.log("OCF - Decading factor: " + decading_factor);
                                //console.log("OCF - Parcel total distance: " + parcel_total_distance);
                                //console.log("OCF - Final carried parcel score if pickup: " + (final_reward + me.score));
                                if (final_reward < 0)
                                    final_reward = 0;
                                my_parcels_db_pickup.set(parcel, final_reward);
                            }
                        }

                        console.log("Parcel_db");
                        console.log(parcel_db)

                        /// 2.2.4.3.4 Calculate the currently analyzed parcel final reward.

                        let current_parcel_final_reward = p.reward - Math.round(parcel_total_distance * decading_factor);
                      
                        if (current_parcel_final_reward < 0) {
                            current_parcel_final_reward = 0;
                        }

                        /// 2.2.4.3.5 Calculating the agent final reward (sum of all carried parcels + currently analyzed perceived parcel reward estimations).

                        var agent_total_final_reward_pickup = current_parcel_final_reward;

                        console.log("OCF - Agent total final reward if pickup parcel " + p.id + " is " + agent_total_final_reward_pickup);

                        for (const [key, final_reward] of my_parcels_db_pickup.entries()) {
                            agent_total_final_reward_pickup += final_reward;
                        }


                        console.log("OCF - Agent total final reward if pickup parcel " + p.id + " is " + agent_total_final_reward_pickup + " after sum");


                        /// 2.2.4.3.6 Comparison between the agent's final reward in the case of picking up the currently analyzed perceived parcel vs. the case of not picking up any parcel. 
                        /// If picking up the parcel grants a gain in terms of reward, the currently analyzed perceived parcel is added to the list of valid parcels. 

                        if (agent_total_final_reward_pickup > agent_total_final_reward_no_pickup) {
                            valid_parcels.set(agent_total_final_reward_pickup, p);
                            console.log("Parcel " + p.id + " is set!");
                        }

                        console.log("OCF - The pickup of valid parcel " + p.id + " will provide a final reward of:  " + agent_total_final_reward_pickup);


                    }  /// End of perceived parcels loop. 

                } /// End of if to check that the currently analyzed parcel is not carried by me. 

                // If the best option of the long-term parcel_db is not null and the Agent carries two or less parcels

                if ((best_memorized_parcel != null) && (me.parcel_count <= 2)) {
                  
                    let memory_my_parcels_db_pickup = new Map;

                    for (const [pid, parcel] of parcel_db.entries()) {
                        if (parcel.carriedBy == me.id) {
                            let eventual_reward = parcel.reward - Math.round(memorized_parcel_option[2] * decading_factor);
                            if (eventual_reward < 0)
                            eventual_reward = 0;
                            memory_my_parcels_db_pickup.set(parcel, eventual_reward);
                        }
                    }

                 
                    // Calculating the agent final reward (sum of all carried parcels + currently analyzed perceived parcel reward estimation from long-term parcel_db).

                    var agent_memory_final_reward_pickup = memorized_parcel_option[1];

                    console.log("OCF - Agent total final reward if pickup parcel from long-term parcel_db " + best_memorized_parcel.id + " is " + agent_memory_final_reward_pickup);

                    for (const [key, eventual_reward] of memory_my_parcels_db_pickup.entries()) {
                        agent_memory_final_reward_pickup += eventual_reward;
                    }


                    console.log("OCF - Agent total final reward if pickup parcel from long-term parcel_db  " + best_memorized_parcel.id + " is " + agent_memory_final_reward_pickup + " after sum");

                }

                /// 2.2.4.4 Check if there is any parcel in the list of the valid parcels (the perceived parcel that likely, due to the estimation done, 
                /// will grant a gain in terms of agent's total final reward). If the list is empty the go_delivery option is selected as the best one. 
                /// Otherwise the go_pickup option for the parcel that grants the highest reward is selected as the best one. 

                // Agent consider long-term parcel_db only if it carries less than 3 parcels
                 if ((best_memorized_parcel != null) && (me.parcel_count <= 2)) {

                    // If we have valid options in the sensing area, we compare them to the best option of the long-term parcel_db
                    if (valid_parcels.size > 0) {
                        var best_parcel;
                        var highest_reward = 0;
                        for (const [reward, parcel] of valid_parcels.entries()) {
                            if (reward > highest_reward) {
                                highest_reward = reward;
                                best_parcel = parcel;
                            }
                        }
                    

                    if (agent_memory_final_reward_pickup > (highest_reward + 10)) {

                        console.log("OCF - Patrolling to the best available parcel of the long-term parcel_db has the possibility to grant the highest score. The parcel is: ");
                        console.log(best_memorized_parcel);
                        best_option = ['patrolling', best_memorized_parcel.x, best_memorized_parcel.y];
                    } else {
    
                        console.log("OCF - Picking up one of the perceived parcels will probably grant a gain in terms of score. The parcel is:");
                        console.log(best_parcel);
                        best_option = ['go_pick_up', best_parcel.x, best_parcel.y, best_parcel.id];
                    }
                } else {
                    // If agent doesn't have available parcel in sensing scope -> it checks what value the parcel outside the sensing scope generates and makes decision
                    if (agent_memory_final_reward_pickup > 15) {
                        console.log("OCF - Patrolling to the best available parcel of the long-term parcel_db has the possibility to grant the highest score. The parcel is: ");
                        console.log(best_memorized_parcel);
                        best_option = ['patrolling', best_memorized_parcel.x, best_memorized_parcel.y];
                    } else {
                    console.log("OCF - None of the perceived parcels will grant a gain in terms of score. Let's go directly to delivery.");
                    best_option = ['go_put_down', agent_nearest_delivery_tile.x, agent_nearest_delivery_tile.y, true];
                    }
                 }  
                }   
                // else case is the standard version that we had implemented before            
                 else {

                // If there is at least a valid parcel that will probably produce a gain in terms of score, select the one that will probably grant the highest reward. 
                if (valid_parcels.size > 0) {
                    var best_parcel;
                    var highest_reward = 0;
                    for (const [reward, parcel] of valid_parcels.entries()) {
                        if (reward > highest_reward) {
                            highest_reward = reward;
                            best_parcel = parcel;
                        }
                    }

                    console.log("OCF - Picking up one of the perceived parcels will probably grant a gain in terms of score. The parcel is:");
                    console.log(best_parcel);
                    best_option = ['go_pick_up', best_parcel.x, best_parcel.y, best_parcel.id];

                    // If none of the perceived parcel will grant a gain, go to delivery directly. 
                } else {
                    console.log("OCF - None of the perceived parcels will grant a gain in terms of score. Let's go directly to delivery.");
                    best_option = ['go_put_down', agent_nearest_delivery_tile.x, agent_nearest_delivery_tile.y, true];
                }
              }
            }
        }
    }

    console.log("OCF - The best option produced by the reasoning function is:");
    console.log(best_option);
    // Returning the finally produced option. 
    return best_option;
}

// Function to clean up and maintain updated the parcel DB at every moment (PDC). 

function clean_parcel_db() {
    for (const [pid, parcel] of parcel_db.entries()) {
        var current_distance = calculate_distance(parcel.x, parcel.y, me.x, me.y)
        // Delete the parcels that are outside my perceiving area. 
        if (current_distance >= parcel_sensing_distance)
            parcel_db.delete(pid);
        // Delete the parcels that I was carrying but that are gone due to degradation.
        if (parcel.carriedBy == me.id && current_distance > 0) {
            parcel_db.delete(pid);
        }
    }
    // Update of the counter of the parcels I am currently carrying.
    var my_parcels_counter = 0;
    for (var [pid, parcel] of parcel_db) {
        if (parcel.carriedBy == me.id) {
            my_parcels_counter++;
        }
    }
    me.parcel_count = my_parcels_counter;

    //console.log("PDC - Parcel DB cleaned.")
}

// Parcel DB management and best option generation on parcel sensing (PDM).

client.onParcelsSensing(async perceived_parcels => {

    clean_parcel_db();

    // Parcel DB management.

    for (const p of perceived_parcels) {
        if (p.carriedBy == me.id) { // If currently carried by me, update parcel's information. 
            p.x = Math.round(p.x);
            p.y = Math.round(p.y);
            parcel_db.set(p.id, p); // Update the parcel into the databse. 
        } else if (p.carriedBy == null) { // If the parcel is not carried by anybody.
            p.x = Math.round(p.x);
            p.y = Math.round(p.y);
            long_term_parcel_db.set(p.id, p); // Save the parcel into the long term database.
            parcel_db.set(p.id, p); // Save the parcel into the database.
        }
    }
    clean_ltpdb();

    // Best option generation.

    clean_parcel_db();
    var best_option;
    if (me.parcel_count < parcel_db.size) {
        best_option = option_choosing_function(); // Call the function to produce the best option. 
        await myAgent.push(best_option); // Push the best option into the intention queue. 
        console.log("PDM - Intention queue after pushing in parcel DB:");
        myAgent.intention_queue.forEach(intention => {
            console.log(intention.predicate);
        });
    }
});

// Long term parcel DB content update function. 

function update_ltpdb() {

    // For each parcel in the long term parcel DB. 
    for (const [pid, parcel] of long_term_parcel_db) {
        parcel.reward--; // Decrease the value automatically also if I currently don't see the parcel (ths function is called periodically, basing on decading nterval value).
        if (parcel.reward == 0) { // If a parcel that I can't see reaches reward 0, remove it. 
            long_term_parcel_db.delete(pid);
        }
    }
    console.log("ULTPDB - Parcels rewards updated.");
    if (long_term_parcel_db.size == 0) {
        console.log("ULTPDB - Long term parcel DB is empty.");
    } else {
        console.log("ULTPDB - Long term parcel DB size: " + long_term_parcel_db.size);
    }

    console.log("ULTPDB - Long term parcel DB:");
    for (const [pid, parcel] of long_term_parcel_db) {
        console.log(parcel);
    }
}

// Long term parcel DB content clean parcel function. 

function clean_ltpdb() {

    for (const [pid, parcel] of long_term_parcel_db) {
        let pdb_parcel = parcel_db.get(pid);
        if (pdb_parcel) {
            if (pdb_parcel.carriedBy != null) {
                long_term_parcel_db.delete(pid);
                console.log("CLTPDB - Removed parcel " + parcel + " because now it is carried by someone.");
            } else {
                long_term_parcel_db.set(pid, pdb_parcel);
                console.log("CLTPDB - Updated parcel " + parcel);
            }
        } else { 
            let distance_me_parcel = calculate_distance(parcel.x, parcel.y, me.x, me.y);
            if (distance_me_parcel < parcel_sensing_distance) {
                long_term_parcel_db.delete(pid);
                console.log("CLTPDB - Removed parcel " + pid + " because it should be here but it's not anymore.");
                console.log("CLTPDB - distance me/parcel: " + distance_me_parcel);
                console.log("CLTPDB - distance sensing: " + parcel_sensing_distance);
            }
        }
    }
}

// Agent sensing management (not used in this version).

/*
client.onAgentsSensing((agents) => {

    for (const a of agents) {

        if (a.x % 1 != 0 || a.y % 1 != 0) // skip intermediate values (0.6 or 0.4)
            continue;

        // I meet someone for the first time
        if (!agent_db.has(a.id)) {

            agent_db.set(a.id, [a])

        } else { // I remember him

            // this is everything I know about him
            const history = agent_db.get(a.id)

            // this is about the last time I saw him
            const last = history[history.length - 1]
            const second_last = (history.length > 2 ? history[history.length - 2] : 'no knowledge')

            if (last != 'lost') { // I was seeing him also last time

                if (last.x != a.x || last.y != a.y) { // But he moved

                    history.push(a)

                }

            } else { // I see him again after some time

                history.push(a)

                if (second_last.x != a.x || second_last.y != a.y) {
                  //  console.log('Welcome back, seems that you moved', a.name, "; Your Score is: ", a.score)
                } else {
                   // console.log('Welcome back, seems you are still here as before', a.name, "; Your Score is: ", a.score)
                }

            }

        }

    }

    for (const [id, history] of agent_db.entries()) {

        const last = history[history.length - 1]
        const second_last = (history.length > 1 ? history[history.length - 2] : 'no knowledge')

        if (!agents.map(a => a.id).includes(id)) {
            // If I am not seeing him anymore

            if (last != 'lost') {
                // Just went off

                history.push('lost');
                console.log('Bye', last.name);

            }

        }

    }

})*/

/// The core classes.

// Intention revision loop class (IRL).

class IntentionRevision {

    // The intention queue. 
    #intention_queue = new Array();

    get intention_queue() {
        return this.#intention_queue;
    }

    set intention_queue(new_intention_queue) {
        this.#intention_queue = new_intention_queue;
    }
    // The main decisional loop. 
    async loop() {
        while (true) {
            if (game_initialized) { // Check if the game has been initialized. 
                if (parcel_decading_interval != "infinite") {
                    if (interval_trigger) {
                        console.log("IRL - Long term DB update interval: " + ltpdb_update_interval + " ms.");
                        setInterval(update_ltpdb, ltpdb_update_interval);
                        interval_trigger = false;
                    }
                }
                if (this.intention_queue.length == 0) {  // If all the intentions has been consumed. 
                    myAgent.push(option_choosing_function()); // Produce the next best option. 
                } else {
                    console.log("IRL - Intention queue length: " + this.intention_queue.length);
                    console.log("IRL - Intention queue:");
                    this.#intention_queue.forEach(intention => {
                        console.log(intention.predicate);
                    });

                    // Pick as intention to execute the first in the queue. 
                    const intention = this.intention_queue[0];

                    console.log("IRL - Intention that is going to be achieved:")
                    console.log(intention.predicate);

                    // Achieve the intention. 
                    await intention.achieve()
                        // Catch eventual error and continue
                        .catch(error => {
                            console.log('IRL - Failed intention', ...intention.predicate, 'with error:', ...error)
                            console.log(error);
                        });

                    // After intention completation, remove the intention from the queue. 
                    this.intention_queue.shift();
                }

            } else { // If the game hasn't been initialized yet
                // Wait until initialization completes. 
                console.log("IRL - Wait for game to be initialized.");
                await new Promise(r => setTimeout(r, 1000))
            }

            //TODO: Check for case -> other agent picks up parcel (not in this version, we are not considering yet the other agents).

            // Postpone next iteration at setImmediate. 
            await new Promise(res => setImmediate(res));
        }
    }
}

// Intention revision queue class(IRQ). 

class IntentionRevisionQueue extends IntentionRevision {

    async push(predicate) {
   
        const intention = new Intention(this, predicate);

     // No previous intention in IQ -> push new Intention anyway
        if (this.intention_queue.length == 0) {
            console.log("IRQ - Case 1");
            this.intention_queue.push(intention);
        }
        // Agent wants to deliver carried parcels but senses a benefitial parcel on the way to delivery tile
         else if (this.intention_queue.length > 0 && (this.intention_queue[0].predicate[0] === 'go_put_down' && intention.predicate[0] === 'go_pick_up' )) {
              console.log("IRQ - Case 2");

              if (this.intention_queue.find((i) => i.predicate.join(' ') == predicate.join(' ')))
              return; // Intention is already queued.

              this.intention_queue[0].stop();
              this.intention_queue.unshift(intention);

        } 
        // Agent is currently patrolling and senses a new parcel
            else if (this.intention_queue.length > 0 && (this.intention_queue[0].predicate[0] === 'patrolling' && intention.predicate[0] === 'go_pick_up')) {

            console.log("IRQ - Case 3");
            this.intention_queue[0].stop();
            this.intention_queue.shift();
            this.intention_queue.push(intention);

        }
        // Agent already is in the process to pick up a parcel and another parcel is sensed
            else if (this.intention_queue.length > 0 && intention.predicate[0] == 'go_pick_up') {

                if (this.intention_queue[0].predicate[0] === 'go_put_down') {
                console.log("IRQ - Case 4.1 -> IRQ - Case 2 already takes care of Intention Revision");
                return;
            }

            if (this.intention_queue.find((i) => i.predicate.join(' ') == predicate.join(' '))){
                console.log("IRQ - Case 4.2 -> Intention is already queued");
                return; // Intention is already queued.
            }
                

            // Because Intention Queue is Size 1 the new intention is pushed either way - only the order has to be determined  
            if (this.intention_queue.length == 1) { 
            
            let priority = ordering_IntentionQueue(intention, this.intention_queue[0]);

            if (priority == "exception") {
                console.log("ERROR CAUGHT! IQ Size 1")
                intention_revision_reset();
            }
            else if (priority == intention.predicate[3]) {
              console.log("IRQ - Case 4.3.1 -> IQ Size 1 - Reordering is needed");
              this.intention_queue[0].stop();
              this.intention_queue.unshift(intention);
            } else {
              console.log("IRQ - Case 4.3.2 -> IQ Size 1 - No new order is needed!");
              this.intention_queue.push(intention);  
            } 
           }
           // Since Intention Queue has Size 2 it has to be checked if new parcel is pushed and in which place it will be pushed
           else if (this.intention_queue.length == 2) {
                
            let priority_1 = ordering_IntentionQueue(intention, this.intention_queue[0]);

            if (priority_1 == "exception") {
                console.log("ERROR CAUGHT! IQ Size 2 - Prio 1")
                intention_revision_reset();
            }
            else if (priority_1 == intention.predicate[3]) {
                console.log("IRQ - Case 4.4.1 -> IQ Size 2 - New Intention is BEST Intention");
                this.intention_queue[0].stop();
                this.intention_queue.unshift(intention);
                this.intention_queue.pop();
              } else {
                console.log("IRQ - Case 4.4.2 -> IQ Size 2 - New Intention is NOT Best Intention");
                
                let priority_2 = ordering_IntentionQueue(intention, this.intention_queue[1]);

                if (priority_2 == "exception") {
                    console.log("ERROR CAUGHT!  IQ Size 2 - Prio 2")
                    intention_revision_reset();
                } else if (priority_2 == intention.predicate[3]) {
                    console.log("IRQ - Case 4.5.1 -> IQ Size 2 - New Intention is SECOND best Intention");
                    this.intention_queue.pop();
                    this.intention_queue.push(intention);
                  } else {
                    console.log("WARNING: IRQ - Case 4.5.2 -> IQ Size 2 - New Intention is WORST! New Intention gets deleted");
                  }
              } 
            } else {
                console.log("ALERT! ALERT! IQ OUT OF SCOPE! Intention Queue Size: " + this.intention_queue.length);
            }
        }
    }
}

// Instance of IRQ (my soul);
const myAgent = new IntentionRevisionQueue();

// Start the main decisional loop. 
myAgent.loop();

// The intention class (I). 

class Intention {

    // Plan currently used for achieving the intention. 
    #current_plan;
    // This is used to stop the intention.
    #stopped = false;
    get stopped() {
        return this.#stopped;
    }
    stop() {
        // this.log( 'stop intention', ...this.#predicate );
        this.#stopped = true;
        if (this.#current_plan)
            this.#current_plan.stop();
    }
    // #parent refers to caller.
    #parent;
    // Predicate is in the form ['go_to', x, y].
    get predicate() {
        return this.#predicate;
    }
    #predicate;
    constructor(parent, predicate) {
        this.#parent = parent;
        this.#predicate = predicate;
    }
    log(...args) {
        if (this.#parent && this.#parent.log)
            this.#parent.log('\t', ...args)
        else
            console.log(...args)
    }
    #started = false;
    // Using the plan library to achieve an intention.
    async achieve() {
        // Cannot start twice
        if (this.#started)
            return this;
        else
            this.#started = true;
        // Trying all plans in the library
        for (const planClass of planLibrary) {
            // if stopped then quit
            if (this.stopped) throw ['I - Stopped intention', ...this.predicate];
            // if plan is 'statically' applicable
            if (planClass.isApplicableTo(...this.predicate)) {
                // plan is instantiated
                this.#current_plan = new planClass(this.parent);
                //this.log('achieving intention', ...this.predicate, 'with plan', planClass.name);
                // and plan is executed and result returned
                try {
                    // console.log("tryin to execute into achieve");
                    // console.log("predicate: " + this.predicate);
                    const plan_res = await this.#current_plan.execute(...this.predicate);
                    // console.log("plan res: " + plan_res);
                    this.log('succesful intention', ...this.predicate, 'with plan', planClass.name, 'with result:', plan_res);
                    return plan_res;
                    // or errors are caught so to continue with next plan
                } catch (error) {
                    this.log('I - Failed intention', ...this.predicate, 'with plan', planClass.name, 'with error:', error);
                }
            }
        }
        // if stopped then quit
        if (this.stopped) throw ['I - Stopped intention', ...this.predicate];
        // no plans have been found to satisfy the intention
        // this.log( 'no plan satisfied the intention ', ...this.predicate );
        throw ['I - no plan satisfied the intention ', ...this.predicate]
    }
}

// The plan library.
const planLibrary = [];

// The plan class (PL). 

class Plan {
    // This is used to stop the plan
    #stopped = false;
    stop() {
        // this.log( 'stop plan' );
        this.#stopped = true;
        for (const i of this.#sub_intentions) {
            i.stop();
        }
    }
    get stopped() {
        return this.#stopped;
    }
    // #parent refers to caller
    #parent;
    constructor(parent) {
        this.#parent = parent;
    }
    log(...args) {
        if (this.#parent && this.#parent.log)
            this.#parent.log('\t', ...args)
        else
            console.log(...args)
    }
    // this is an array of sub intention. Multiple ones could eventually being achieved in parallel.
    #sub_intentions = [];
    async subIntention(predicate) {
        const sub_intention = new Intention(this, predicate);
        this.#sub_intentions.push(sub_intention);
        return await sub_intention.achieve();
    }

}

/// The plans classes. 

// The GoPickUp class. 

class GoPickUp extends Plan {
    static isApplicableTo(go_pick_up, x, y, id) {
        return go_pick_up == 'go_pick_up';
    }
    async execute(go_pick_up, x, y) {
        if (this.stopped) throw ['stopped']; // if stopped then quit
        await this.subIntention(['go_to', x, y]);
        if (this.stopped) throw ['stopped']; // if stopped then quit
        await client.pickup()
        if (this.stopped) throw ['stopped']; // if stopped then quit

        clean_parcel_db();
        clean_ltpdb();

        return true;
    }
}

// The GoPutDown plan (delivery) class. 

class GoPutDown extends Plan {
    static isApplicableTo(go_put_down, x, y) {
        return go_put_down == 'go_put_down';
    }
    async execute(go_put_down, x, y) {
        if (this.stopped) throw ['stopped']; // if stopped then quit
        await this.subIntention(['go_to', x, y]);
        if (this.stopped) throw ['stopped']; // if stopped then quit
        for (const [pid, p] of parcel_db.entries()) { //Remove the carried parcels from parcels DB. 
            if (p.carriedBy == me.id) {
                parcel_db.delete(pid);
            }
        }
        await client.putdown()
        if (this.stopped) throw ['stopped']; // if stopped then quit

        clean_parcel_db();
        clean_ltpdb();

        return true;
    }
}

// The Patrolling plan class. 

class Patrolling extends Plan {
    static isApplicableTo(patrolling, x, y) {
        return patrolling == 'patrolling';
    }
    async execute(patrolling, x, y) {
        if (this.stopped) throw ['stopped']; // if stopped then quit      
        await this.subIntention(['go_to', x, y]);
        clean_parcel_db();
        return true;
    }
}

// The BlindMove plan class. 

class BlindMove extends Plan {

    static isApplicableTo(go_to, x, y) {
        return go_to == 'go_to';
    }

    async execute(go_to, x, y) {

        while (me.x != x || me.y != y) {

            if (this.stopped) throw ['stopped']; // if stopped then quit

            let status_x = false;
            let status_y = false;

            // this.log('me', me, 'xy', x, y);

            if (x > me.x)
                status_x = await client.move('right')
            // status_x = await this.subIntention( 'go_to', {x: me.x+1, y: me.y} );
            else if (x < me.x)
                status_x = await client.move('left')
            // status_x = await this.subIntention( 'go_to', {x: me.x-1, y: me.y} );

            if (status_x) {
                me.x = status_x.x;
                me.y = status_x.y;
            }

            if (this.stopped) throw ['stopped']; // if stopped then quit

            if (y > me.y)
                status_y = await client.move('up')
            // status_x = await this.subIntention( 'go_to', {x: me.x, y: me.y+1} );
            else if (y < me.y)
                status_y = await client.move('down')
            // status_x = await this.subIntention( 'go_to', {x: me.x, y: me.y-1} );

            if (status_y) {
                me.x = status_y.x;
                me.y = status_y.y;
            }

            if (!status_x && !status_y) {
                this.log('stucked');
                throw 'stucked';
            } else if (me.x == x && me.y == y) {
                // this.log('target reached');
            }

        }

        clean_parcel_db();
        clean_ltpdb();

        return true;

    }
}

// The plan classes are added to plan library.
planLibrary.push(GoPickUp)
planLibrary.push(BlindMove)
planLibrary.push(GoPutDown)
planLibrary.push(Patrolling)






