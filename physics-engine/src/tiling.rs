
/// Tiled Rendering Manager
///
/// Strategies for dividing the screen into tiles for progressive rendering.
/// Optimizes GPU workload by prioritizing center or user-gaze.

use std::collections::VecDeque;

#[derive(Debug, Clone, Copy)]
pub struct Tile {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
    pub priority: f32,
}

pub struct TileManager {
    width: u32,
    height: u32,
    tile_size: u32,
    queue: VecDeque<Tile>,
}

impl TileManager {
    pub fn new(width: u32, height: u32, tile_size: u32) -> Self {
        let mut manager = Self {
            width,
            height,
            tile_size,
            queue: VecDeque::new(),
        };
        manager.generate_tiles();
        manager
    }

    /// Generate tiles (simple grid for now)
    /// Future: Spiral pattern or Gaze-contingent
    fn generate_tiles(&mut self) {
        self.queue.clear();
        let cols = (self.width + self.tile_size - 1) / self.tile_size;
        let rows = (self.height + self.tile_size - 1) / self.tile_size;

        for y in 0..rows {
            for x in 0..cols {
                self.queue.push_back(Tile {
                    x: x * self.tile_size,
                    y: y * self.tile_size,
                    width: self.tile_size,
                    height: self.tile_size,
                    priority: 1.0, 
                });
            }
        }
    }

    pub fn pop_tile(&mut self) -> Option<Tile> {
        self.queue.pop_front()
    }

    pub fn remaining(&self) -> usize {
        self.queue.len()
    }
}
