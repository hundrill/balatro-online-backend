import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/auth/register (POST) - 회원가입', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test1@example.com',
        password: 'test1234',
        nickname: 'testuser1',
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('/auth/login (POST) - 로그인', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test1@example.com', password: 'test1234' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('user');
  });

  it('/users (GET) - 유저 목록', async () => {
    const res = await request(app.getHttpServer()).get('/users');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  afterAll(async () => {
    await app.close();
  });
});
