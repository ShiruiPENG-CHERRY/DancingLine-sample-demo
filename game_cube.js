import {
    init_unity_academy_3d,
    set_start,
    set_update,
    instantiate,
    delta_time,
    translate_world,
    get_key_down,
    vector3,
    scale_vector,
    set_position,
    set_scale,
    get_x,
    get_z,
    get_position
} from "unity_academy";

init_unity_academy_3d();

// === 配置参数 ===
const line_speed = 8;
const segment_size = vector3(1, 0.2, 1);
const segment_gap = 1;

// === 状态变量 ===
let current_direction = vector3(0, 0, 1);
let last_position = vector3(0, 0, 0);
let distance_since_last_segment = 0;

// === 主体方块 ===
const line_head = instantiate("cube");

// === Start 函数 ===
function my_start(self) {
    set_position(self, last_position);
    set_scale(self, segment_size);
    spawn_segment(last_position);
}

// === Update 函数 ===
function my_update(self) {
    // 检测转向
    if (get_key_down("Space")) {
        if (get_z(current_direction) === 1) {
            current_direction = vector3(1, 0, 0);
        } else if (get_x(current_direction) === 1) {
            current_direction = vector3(0, 0, -1);
        } else if (get_z(current_direction) === -1) {
            current_direction = vector3(-1, 0, 0);
        } else if (get_x(current_direction) === -1) {
            current_direction = vector3(0, 0, 1);
        }
        spawn_segment(get_position(self));
        distance_since_last_segment = 0;
    }

    // 移动主体
    const move_vec = scale_vector(current_direction, line_speed * delta_time());
    translate_world(self, move_vec);

    // 更新距离
    distance_since_last_segment = distance_since_last_segment + vector_length(move_vec);

    if (distance_since_last_segment >= segment_gap) {
        spawn_segment(get_position(self));
        distance_since_last_segment = 0;
    }
}

// === 辅助函数：生成新 segment 方块 ===
function spawn_segment(pos) {
    const seg = instantiate("cube");
    set_position(seg, pos);
    set_scale(seg, segment_size);
}

// === 向量长度 ===
function vector_length(v) {
    const x = get_x(v);
    const z = get_z(v);
    return math_sqrt(x * x + z * z);
}

set_start(line_head, my_start);
set_update(line_head, my_update);
