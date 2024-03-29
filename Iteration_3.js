import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";

const client = new DeliverooApi(
    'http://localhost:8080',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImI4NWY1MWE4ZTg4IiwibmFtZSI6ImRvZmIiLCJpYXQiOjE2OTEwNDk3NzV9.n0wlpwc5301NNDfJtxG7rs4sd9MsYTFaClHMxYD61mA')

function distance({ x: x1, y: y1 }, { x: x2, y: y2 }) {
    const dx = Math.abs(Math.round(x1) - Math.round(x2))
    const dy = Math.abs(Math.round(y1) - Math.round(y2))
    return dx + dy;
}

function distance_coordinates(target_x, target_y, tile_x, tile_y) {
    const dx = Math.abs(Math.round(target_x) - Math.round(tile_x))
    const dy = Math.abs(Math.round(target_y) - Math.round(tile_y))
    return dx + dy;
}

/**
 * Beliefset revision function
 */
const me = {};

client.onYou(({ id, name, x, y, score }) => {
    me.id = id
    me.name = name
    me.x = x
    me.y = y
    me.score = score
})


me.carrying;
me.parcel_count = 0;
var parcel_decading_interval; //String
var parcel_sensing_distance;
var max_parcels; //Integer
var delivery_tiles_database = [];

var current_parcel;

var patrolling_area_counter = 1;

client.onConfig((config) => {
    parcel_decading_interval = config.PARCEL_DECADING_INTERVAL;
    parcel_sensing_distance = config.PARCELS_OBSERVATION_DISTANCE;
    max_parcels = config.PARCELS_MAX;
    me.carrying = false;
})

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
client.onMap((width, height, tiles) => {
    map.width = width;
    map.height = height;
    for (const t of tiles) {
        map.add(t);
        //Add delivery tiles to delivery tiles db.
        if (t.delivery) {
            delivery_tiles_database.push(t);
        }
    }
    select_patrolling_points();
})

client.onTile((x, y, delivery) => {
    map.add({ x, y, delivery });
})

var first = true;


/**
 * @type {Map<string,[{id,name,x,y,score}]}
 */
const agent_db = new Map()

/**
 * @type {Map<string,[{id, x, y, carriedBy, reward}]}
 */
const parcel_db = new Map()

/**
 * @type {Map<string,[{id, x, y, carriedBy, reward}]}
 */
const me_carried_parcels = new Map()

/**
 * @type {Map<string,[{x_coordinate}]}
 */
const patrolling_x_coordinates = new Map()

/**
 * @type {Map<string,[{y_coordinate}]}
 */
const patrolling_y_coordinates = new Map()


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

function check_patrolling_point(x, y) {
    var valid_tile = false;
    for (const tile of map.tiles.values()) {
        if (tile.x == x && tile.y == y) {
            valid_tile == true;
        }
    }

    return valid_tile;
}

function patrolling_case_selection() {

    let idle;

    //Check Quadrant Counter is in bounds
    if (patrolling_area_counter > 4 || patrolling_area_counter < 1) {
        patrolling_area_counter = 1;
    }

    console.log(patrolling_area_counter)
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

    myAgent.push(idle)
}


function reward_reasoning_function() {

    console.log("REWARD FUNCTION IS CALLED!");

    // Reward Decision Function

     // 1. Select the suitable decading_factor for our given parcel degredation

    var decading_factor;

    switch (parcel_decading_interval) {
        case '1s': decading_factor = 1;

            break;

        case '2s': decading_factor = 0.5;

            break;

        case '5s': decading_factor = 0.2;

            break;

        case '10s': decading_factor = 0.1;

        default: decading_factor = 0;
            break;
    }

   
    // 2.1. Finding the nearest delviery tile respect to the current position of the agent. 

    // distance of closest delivery tile to agents position + closest delivery tile
    var distance_closest_delivery_tile_agent = -1;
    var agent_nearest_delivery_tile;

    for (const dt of delivery_tiles_database ) {
         let distance = distance_coordinates(dt.x, dt.y, me.x, me.y);
          if (distance_closest_delivery_tile_agent == -1) {
            distance_closest_delivery_tile_agent = distance;
            agent_nearest_delivery_tile = dt;
        } else {
            if (distance < distance_closest_delivery_tile_agent) {
                distance_closest_delivery_tile_agent = distance;
            agent_nearest_delivery_tile = dt;
        }
        }
    }    
       
  
    console.log("Agent nearest DT");
    console.log(agent_nearest_delivery_tile);

  // 2.2 Simulate the total reward of all carried parcels in case of an instant delivery

  var reward_if_deliver_instant = 0;

  console.log("My carried parcels are:");
  console.log(me_carried_parcels)
  

  

    for (const [key, value] of me_carried_parcels.entries()) {
            let individual_reward = value[0].reward - Math.round(distance_closest_delivery_tile_agent * decading_factor); //Todo: Check if rounding or cutoff is needed
            if (individual_reward < 0) {
            individual_reward = 0;
            }
            reward_if_deliver_instant += individual_reward;
        }
    

    console.log("PARCEL DB")
    console.log(parcel_db);

    console.log("The parcels that Agent is carrying are: ");
    console.log(me_carried_parcels);

    console.log("Parcel Reward Simulation direct Delivery:")
    console.log(reward_if_deliver_instant);

    //TODO: maybe cleanup here the parceldb from no more existing parcels.  

 // 3. Simulate the total reward if the agent picks up a newly perceived parcel

 var parcel_with_highest_reward;
 var highest_reward_of_parcels = 0;

  for (const [key, value] of parcel_db.entries()) {
    
 // 3.1 Find the nearest delivery tile to the parcel we simulate picking up + calculate the distence between the agent and the parcel

 var distance_closest_delivery_tile_parcel = -1;
 var parcel_closest_delivery_tile;
 var parcel_agent_distance = 0;
 var parcel_total_distance = 0;

 for (const dt of delivery_tiles_database ) {
      let distance = distance_coordinates(dt.x, dt.y, value[0].x, value[0].y);
       if (distance_closest_delivery_tile_parcel == -1) {
         distance_closest_delivery_tile_parcel = distance;
         parcel_closest_delivery_tile = dt;
     } else {
         if (distance < distance_closest_delivery_tile_parcel) {
            distance_closest_delivery_tile_parcel = distance;
             parcel_closest_delivery_tile = dt;
     }
     }
 }    
 console.log("Closest Delivery Tile to parcel " + value[0].id + " is:");
 console.log(parcel_closest_delivery_tile);

         parcel_agent_distance = distance_coordinates(value[0].x, value[0].y, me.x, me.y);
         parcel_total_distance = distance_closest_delivery_tile_parcel + parcel_agent_distance;

console.log("Complete distance for parcel " + key + " is: ");
console.log(parcel_total_distance);

     // 3.2 Calculate the currently analyzed parcel final reward.
     var current_parcel_final_reward = 0;

     current_parcel_final_reward = value[0].reward - Math.round(parcel_total_distance * decading_factor);

     if (current_parcel_final_reward < 0) {
        console.log ("Skipping - parcel reward is below 0, parcel reward = " + current_parcel_final_reward);
         }

    console.log("Current Parcel " + key + " Reward = " + current_parcel_final_reward);
 /// 3.3 Calculate the reward for all carried parcels in the case of picking up new parcel p

 var projected_reward_me_parcels = 0;

 for (const [key, value] of me_carried_parcels.entries()) {
    let individual_reward = value[0].reward - Math.round(parcel_total_distance * decading_factor);
    if (individual_reward < 0) {
        individual_reward = 0;
    }
    
    projected_reward_me_parcels += individual_reward;
 }
 console.log("All carried Parcel Reward Simulation Pick Up new parcel:")
 console.log(projected_reward_me_parcels);

 /// 3.4 Combining projected reward of current parcel with the projected reward of all parcels the agent carries

 var sum_after_pick_up = 0;

 sum_after_pick_up = projected_reward_me_parcels + current_parcel_final_reward;

 console.log ("The Final reward if we pick up parcel " + key + " is: " + sum_after_pick_up);

 /// 4 Compare reward of picking up current parcel with the highest reward out of parcel_db

 if (sum_after_pick_up > highest_reward_of_parcels) {
    highest_reward_of_parcels = sum_after_pick_up;
    parcel_with_highest_reward = key;
    console.log("Parcel " + key + " offers the best reward with: " + highest_reward_of_parcels);
 } else {
    console.log("Skipping - Parcel " + key + " has a lower reward than the best option");
    console.log("Parcel " + parcel_with_highest_reward + " still offers the best reward with: " + highest_reward_of_parcels)
    continue;
 }
}

// 5 Compare parcel that offers us the highest reward (when picking it up) with delivering currently carried parcels straight away and push option to agent

var best_option;

if (highest_reward_of_parcels > reward_if_deliver_instant) {

    let selected_parcel = parcel_db.get(parcel_with_highest_reward);
    console.log(selected_parcel);
    best_option = ['go_pick_up', selected_parcel[0].x, selected_parcel[0].y, selected_parcel[0].id];
    console.log("We push the following intention to the agent: ");
    myAgent.push(best_option)
} else if (highest_reward_of_parcels <= reward_if_deliver_instant && me.carrying == true){
    console.log(agent_nearest_delivery_tile);
    best_option = ['go_put_down', agent_nearest_delivery_tile.x, agent_nearest_delivery_tile.y, agent_nearest_delivery_tile.delivery];
    console.log("We push the following intention to the agent: ");
    console.log(best_option);

}

}



client.onParcelsSensing(async (perceived_parcels) => {

    for (const p of perceived_parcels) {

        if (!parcel_db.has(p.id)) {  //not already in database

            if (p.carriedBy == null) {  // not already picked up by somebody else -> Saved in Database

                parcel_db.set(p.id, [p])
            }
        } else {

            if (p.carriedBy != null) {  //check if carried by somebody -> Delete out of Database
                parcel_db.delete(p.id)
            }
        }
    }
})


/**
 * Options generation and filtering function
 */
client.onParcelsSensing(parcels => {

    // TODO revisit beliefset revision so to trigger option generation only in the case a new parcel is observed

    console.log("PARCELS: " + parcels);

    /**
     * Options generation
     */
    const options = []

    if (parcel_decading_interval == "infinite" && me.parcel_count < max_parcels) {
        for (const parcel of parcels.values()) {
            if (!parcel.carriedBy)
                options.push(['go_pick_up', parcel.x, parcel.y, parcel.id]);
        }
    } else if (parcel_decading_interval == "infinite" && me.parcel_count >= max_parcels) {
        for (const tile of map.tiles.values()) {
            if (tile.delivery) {
                options.push(['go_put_down', tile.x, tile.y, tile.delivery]);
            }
        }
    } else if (parcel_decading_interval != 'infinite' && me.carrying != "undefined") {
        console.log("I call reward function");
        console.log("Me.Carrying is: ", me.carrying);
        reward_reasoning_function();
    }

    /* for (const option of options) { //Checking all available Options -> Later Version delete it
        console.log(option)
    } */

    /**
     * Options filtering
     */
    let best_option;

  //TODO: Create adapted reward function for NO (infinete degredation ) - for all 2 cases
  //TODO: -> The new reward function does not work for them since it is either only delivering or only picking up
  //TODO: Push best option to the agent directly from the function
  

    
})

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
                    console.log('Welcome back, seems that you moved', a.name, "; Your Score is: ", a.score)
                } else {
                    console.log('Welcome back, seems you are still here as before', a.name, "; Your Score is: ", a.score)
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

})



/**
 * Intention revision loop
 */
class IntentionRevision {

    #intention_queue = new Array();
    get intention_queue() {
        return this.#intention_queue;
    }

    async loop() {
        while (true) {
           
            // console.log("Parcel Count:" + me.parcel_count)
            console.log("IQ: " + this.intention_queue.length)
            console.log("ME CARRYING " + me.carrying)
            console.log("PARCEL DB ")
            console.log(parcel_db)

            // Consumes intention_queue if not empty
            if (this.intention_queue.length > 0) {
                console.log('intentionRevision.loop', this.intention_queue.map(i => i.predicate));

                // Current intention
                const intention = this.intention_queue[0];

                // console.log("pred[0]: " + intention.predicate[2]);

                if (intention.predicate != "patrolling") {
                    // Is queued intention still valid? Do I still want to0 achieve it?
                    // TODO this hard-coded implementation is an example -> FUTURE SELFS: Add case for Put Down
                    let id = intention.predicate[2]
                    let p = parcel_db.get(id)
                    if (p && p.carriedBy) {
                        console.log('Skipping intention because no more valid', intention.predicate)
                        continue;
                    }
                }
                // Start achieving intention

                await intention.achieve()
                    // Catch eventual error and continue
                    .catch(error => {
                        // console.log( 'Failed intention', ...intention.predicate, 'with error:', ...error )
                        console.log(error);
                    });

                //console.log(this.intention_queue.length)

                // Remove from the queue
                this.intention_queue.shift();


                //Todo: Check for case -> other agent picks up parcel, no parcel spans anymore -> endless loop because we wait for max_parcels
                if (this.#intention_queue.length == 0 && me.parcel_count == max_parcels) {

                    console.log("GOES IN DELIVERY IF!")
                    const delivery_options = [];
                    let best_delivery_option;
                    let nearest = Number.MAX_VALUE;

                    for (const tile of map.tiles.values()) {
                        if (tile.delivery) {
                            delivery_options.push(['go_put_down', tile.x, tile.y, tile.delivery]);
                        }
                    }

                    for (const option of delivery_options) {
                        let [go_put_down, x, y, delivery] = option;
                        let current_d = distance({ x, y }, me)
                        if (current_d < nearest) {
                            best_delivery_option = option
                            nearest = current_d
                        }
                    }


                    /**
                     * Best option is selected
                     */
                    if (best_delivery_option) {
                        myAgent.push(best_delivery_option)
                    }
                }
            } else if (this.intention_queue.length == 0 && me.carrying == false) {
                console.log("2 - GOES IN PATROLLING IF!")

                // TODO: Patrolling only if parcel_db is empty, if parcel is in parcel db -> Reasoning function!

                if (parcel_db.size == 0) {

                    patrolling_case_selection();


                } else if (parcel_db.size > 0) {

                    patrolling_case_selection();

                }

            }
            else if (this.intention_queue.length == 0 && me.carrying == true) {
                console.log("3 - GOES IN PATROLLING IF!")


                //TODO: Additional reasoning if we should deliver or not in case of parcel degredation -> keep in mind only for parcel degredation 


                if (parcel_decading_interval == "infinite") {

                    patrolling_case_selection();

                } else {

                    console.log("4 - GOES IN PATROLLING IF!")

                    //TODO: Check if parcel db size is 0 or > 0; if 0 -> deliver; if > 0 -> reward function to determine best option; patrolling as a current gap filler

                    patrolling_case_selection();

                }
            }

            // Postpone next iteration at setImmediate
            await new Promise(res => setImmediate(res));
        }
    }

    // async push ( predicate ) { }

    log(...args) {
        console.log(...args)
    }

}


class IntentionRevisionQueue extends IntentionRevision {

    async push(predicate) {
        if (this.intention_queue.length == 0) {
            // Check if already queued
            if (this.intention_queue.find((i) => i.predicate.join(' ') == predicate.join(' ')))
                return; // intention is already queued
        } else {

            return; // intention is already queued
        }

        console.log('IntentionRevisionReplace.push', predicate);
        const intention = new Intention(this, predicate);
        this.intention_queue.push(intention);
    }
}



/**
 * Start intention revision loop
 */

const myAgent = new IntentionRevisionQueue();

myAgent.loop();



/**
 * Intention
 */
class Intention {

    // Plan currently used for achieving the intention 
    #current_plan;

    // This is used to stop the intention
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

    /**
     * #parent refers to caller
     */
    #parent;

    /**
     * predicate is in the form ['go_to', x, y]
     */
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
    /**
     * Using the plan library to achieve an intention
     */
    async achieve() {


        // Cannot start twice
        if (this.#started)
            return this;
        else
            this.#started = true;

        // Trying all plans in the library
        for (const planClass of planLibrary) {

            // if stopped then quit
            if (this.stopped) throw ['stopped intention', ...this.predicate];

            // if plan is 'statically' applicable
            if (planClass.isApplicableTo(...this.predicate)) {
                // plan is instantiated
                this.#current_plan = new planClass(this.parent);
                this.log('achieving intention', ...this.predicate, 'with plan', planClass.name);
                // and plan is executed and result returned
                try {
                    console.log("tryin to execute into achieve");
                    console.log("predicate: " + this.predicate);
                    const plan_res = await this.#current_plan.execute(...this.predicate);
                    console.log("plan res: " + plan_res);
                    this.log('succesful intention', ...this.predicate, 'with plan', planClass.name, 'with result:', plan_res);

                    return plan_res
                    // or errors are caught so to continue with next plan
                } catch (error) {
                    this.log('failed intention', ...this.predicate, 'with plan', planClass.name, 'with error:', error);
                }
            }

        }

        // if stopped then quit
        if (this.stopped) throw ['stopped intention', ...this.predicate];

        // no plans have been found to satisfy the intention
        // this.log( 'no plan satisfied the intention ', ...this.predicate );
        throw ['no plan satisfied the intention ', ...this.predicate]
    }

}

/**
 * Plan library
 */
const planLibrary = [];

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

    /**
     * #parent refers to caller
     */
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
        me.carrying = true
        me.parcel_count++;
        me_carried_parcels.add(current_parcel.id, [current_parcel]);
        /*  console.log(parcel_db)
         parcel_db.delete(current_parcel.id)
         console.log("----")
         console.log(parcel_db) */
        current_parcel = null
        return true;
    }

}


class GoPutDown extends Plan {

    static isApplicableTo(go_put_down, x, y) {
        return go_put_down == 'go_put_down';
    }

    async execute(go_put_down, x, y) {
        if (this.stopped) throw ['stopped']; // if stopped then quit
        await this.subIntention(['go_to', x, y]);
        if (this.stopped) throw ['stopped']; // if stopped then quit
        await client.putdown()
        if (this.stopped) throw ['stopped']; // if stopped then quit
        me.carrying = false
        me.parcel_count = 0;
        me_carried_parcels.clear();

        return true;
    }

}

class Patrolling extends Plan {

    static isApplicableTo(patrolling, x, y) {
        return patrolling == 'patrolling';
    }

    async execute(patrolling, x, y) {

        if (this.stopped) throw ['stopped']; // if stopped then quit      
        await this.subIntention(['go_to', x, y]);

        return true;
    }
}

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

        return true;

    }
}

// plan classes are added to plan library 
planLibrary.push(GoPickUp)
planLibrary.push(BlindMove)
planLibrary.push(GoPutDown)
planLibrary.push(Patrolling)

