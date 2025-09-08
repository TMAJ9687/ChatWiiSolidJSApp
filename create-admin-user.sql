-- Create admin user profile for existing auth user
INSERT INTO users (
  id,
  nickname,
  gender,
  age,
  country,
  role,
  status,
  online,
  avatar,
  created_at,
  updated_at
) VALUES (
  '88e25581-7922-4f81-8241-07cb49964289', -- The auth user ID you created
  'Admin',                                  -- Choose a nickname
  'male',                                   -- Choose gender (male/female)
  30,                                       -- Choose age
  'United States',                          -- Choose country
  'admin',                                  -- This makes them admin
  'active',                                 -- Active status
  false,                                    -- Initially offline
  '/avatars/standard/male.png',            -- Default avatar (change to female.png if needed)
  NOW(),                                    -- Created timestamp
  NOW()                                     -- Updated timestamp
);