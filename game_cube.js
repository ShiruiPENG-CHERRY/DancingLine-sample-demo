// Unity Academy Floating Cube Demo
import {init_unity_academy_3d, set_start, set_update, instantiate, delta_time,
translate_world,get_key_down, get_key, get_key_up, get_position, set_position,
get_rotation_euler, set_rotation_euler, rotate_world, get_scale, set_scale, vector3,
scale_vector, get_x } from "unity_academy";

init_unity_academy_3d(); // Initialize the engine

const my_cube = instantiate("cube"); // Create a cube

const my_start = (self) => {
    set_position(self, vector3(0, 0, 15)); // Set the initial position of the cube
    set_scale(self, vector3(2, 3, 1));
};

let move_direction = 1;
let move_speed = 6;
const rotate_speed = 30;

const my_update = (self) => {
    
    const pos_x = get_x(get_position(self));
    
    if( pos_x > 10 ){
        move_direction = -1;
    }
    else if(pos_x < -10){
        move_direction = 1;
    }
    
    if(get_key('A')){
        move_speed = 12;
    }
    else{
        move_speed = 6;
    }
    
    // Moves the cube per frame
    translate_world(self, scale_vector(vector3(1, 0, 0), move_speed * delta_time() * move_direction));
    // Rotates the cube per frame
    rotate_world(self, scale_vector(vector3(1, 1, 1), rotate_speed * delta_time() * move_direction));
    
};
set_start(my_cube, my_start); // Bind my_start to my_cube
set_update(my_cube, my_update); // Bind my_update to my_cube